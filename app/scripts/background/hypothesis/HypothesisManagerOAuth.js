import $ from 'jquery'
import _ from 'lodash'

import ChromeStorage from '../../utils/ChromeStorage'
import OAuthClient from '../../utils/oauth-client'

const hypothesisSettings = {
  // eslint-disable-next-line
  clientId: "048d4244-8515-11ec-b52d-ef322190ff83",
  authorizationEndpoint: 'https://hypothes.is/oauth/authorize',
  revokeEndpoint: 'https://hypothes.is/oauth/revoke',
  tokenEndpoint: 'https://hypothes.is/api/token'
}

const minutesBeforeToTreatTokenAsExpired = 10 // When the token has less than 10 minutes to refresh

/**
 * HypothesisManager handles hypothes.is-client-related operations in the background, login, logout, token management (autorize, refresh, revoke, store), and user metadata
 */
class HypothesisManagerOAuth {
  constructor () {
    // Define token
    this.tokens = {}
    // Login window
    this.authWindow = null
    // Hook called after tokens are stored; set by HypothesisBackgroundManager
    this.onTokensUpdated = null
  }

  /**
   * Initialization of Hypothesis Manager
   */
  init (callback) {
    // Init oauth client
    this.client = new OAuthClient(hypothesisSettings)
    // Load tokens from storage
    this.loadTokensFromStorage((err, tokens) => {
      if (err) {
        console.warn('Unable to load tokens from storage. User need to login again.')
      } else {
        console.debug('Correctly loaded tokens from storage')
        this.tokens = tokens
      }
      if (_.isFunction(callback)) {
        callback()
      }
    })
    // Init responsers to retrieve from other scripts Hypothes.is related information
    this.initResponsers()
  }

  refreshHypothesisToken (callback) {
    // Prevent concurrent refreshes (the background reloads the client every second)
    if (this.refreshing) {
      this.refreshing.then(
        (tokens) => { if (_.isFunction(callback)) callback(null, tokens) },
        (err) => { if (_.isFunction(callback)) callback(err) }
      )
      return
    }
    // If refresh token exists, refresh and return
    if (_.isObject(this.tokens) && this.tokens.refreshToken) {
      this.refreshing = this.client.refreshToken(this.tokens.refreshToken).then((tokens) => {
        // Save refresh token in chrome storage
        this.saveTokensInStorage(tokens)
        this.tokens = tokens
        this.refreshing = null
        return tokens
      }).catch((err) => {
        this.refreshing = null
        throw err
      })
      this.refreshing.then(
        (tokens) => { if (_.isFunction(callback)) callback(null, tokens) },
        (err) => { if (_.isFunction(callback)) callback(err) }
      )
    } else {
      // No refresh token available – user must log in again from the options page
      if (_.isFunction(callback)) {
        callback(new Error('No refresh token available. Please log in again from the options page.'))
      }
    }
  }

  /**
   * Ask for authorization to the user and returns in the callback the access and refresh token
   * @param callback
   */
  authorize (callback) {
    if (_.isNull(this.authWindow) || this.authWindow.closed || _.isNull(this.authPromise)) {
      this.authWindow = OAuthClient.openAuthPopupWindow(window)
      this.authPromise = this.client.authorize(window, this.authWindow)
    }

    this.authPromise.catch(() => {
      // Return user has closed login window
      if (_.isFunction(callback)) {
        callback(new Error('Unable to autorize Hypothes.is.'))
      }
    }).then(code => {
      this.client.exchangeAuthCode(code).then((tokens) => {
        // Save tokens to return
        this.tokens = tokens
        // Save refresh token in chrome storage
        this.saveTokensInStorage(tokens)
        // Return tokens in callback
        if (_.isFunction(callback)) {
          this.authPromise = null
          this.authWindow = null
          callback(null, this.tokens)
        }
      })
    })
  }

  loadTokensFromStorage (callback) {
    ChromeStorage.getData('hypothesisTokens', ChromeStorage.local, (err, data) => {
      if (err) {
        callback(new Error('Unable to retrieve tokens from storage.'))
      } else {
        try {
          const parsedTokens = JSON.parse(data.data)
          callback(null, parsedTokens)
        } catch (e) {
          callback(new Error('Unable to retrieve tokens from storage.'))
        }
      }
    })
  }

  saveTokensInStorage (tokens, callback) {
    ChromeStorage.setData('hypothesisTokens', { data: JSON.stringify(tokens) }, ChromeStorage.local, (err, response) => {
      console.debug('Saved token in storage')
      if (_.isFunction(callback)) {
        callback(err, response)
      }
    })
  }

  initResponsers () {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'hypothesis') {
        if (request.cmd === 'getToken') {
          if (this.checkTokenIsExpired()) {
            this.refreshHypothesisToken((err) => {
              if (err) {
                sendResponse({ error: 'Unable to retrieve token' })
              } else {
                sendResponse({ token: this.tokens.accessToken })
              }
            })
            return true // Async response
          } else {
            sendResponse({ token: this.tokens.accessToken })
          }
        } else if (request.cmd === 'getTokens') {
          if (this.checkTokenIsExpired()) {
            this.refreshHypothesisToken((err) => {
              if (err) {
                sendResponse({ error: 'Unable to retrieve token' })
              } else {
                sendResponse({ tokens: this.tokens })
              }
            })
            return true // Async response
          } else {
            sendResponse({ tokens: this.tokens })
          }
        } else if (request.cmd === 'storeTokens') {
          // Tokens exchanged by the options page; store them and update in-memory state
          const tokens = request.data
          this.tokens = tokens
          this.saveTokensInStorage(tokens, (err) => {
            if (err) {
              sendResponse({ error: 'Unable to store tokens' })
            } else if (_.isFunction(this.onTokensUpdated)) {
              // Reload the annotation client with the new token before responding,
              // so the caller can immediately query getUserProfile without a race.
              this.onTokensUpdated(() => sendResponse({}))
            } else {
              sendResponse({})
            }
          })
          return true // Async response
        } else if (request.cmd === 'userLogout') {
          this.logout((err) => {
            if (err) {
              sendResponse({ error: 'Unable to logout from hypothes.is. Maybe token is already expired or connection to the server is unavailable right now.' })
            } else {
              sendResponse({})
            }
          })
          return true // Async response
        } else if (request.cmd === 'getUserProfileMetadata') {
          this.retrieveUserProfileMetadata((err, metadata) => {
            if (err) {
              sendResponse({ error: 'Unable to retrieve profile metadata' })
            } else {
              sendResponse({ metadata: metadata })
            }
          })
          return true // Async response
        }
      }
    })
  }

  retrieveUserProfileMetadata (callback) {
    const callSettings = {
      async: true,
      crossDomain: true,
      url: 'https://hypothes.is/account/profile',
      method: 'GET'
    }
    $.ajax(callSettings).done((resultString) => {
      const tempWrapper = document.createElement('div')
      tempWrapper.innerHTML = resultString
      try {
        callback(null, {
          displayName: tempWrapper.querySelector('[name="display_name"]').value,
          description: tempWrapper.querySelector('[name="description"]').value,
          location: tempWrapper.querySelector('[name="location"]').value,
          link: tempWrapper.querySelector('[name="link"]').value,
          orcid: tempWrapper.querySelector('[name="orcid"]').value
        })
      } catch (e) {
        callback(e)
      }
    }).fail((error) => {
      callback(error)
    })
  }

  checkTokenIsExpired (callback) {
    if (this.tokens && _.isString(this.tokens.accessToken)) {
      // Before X minutes to expire the token it is treated as expired to refresh again
      return this.tokens.expiresAt - 1000 * 60 * minutesBeforeToTreatTokenAsExpired < Date.now()
    } else {
      return true
    }
  }

  logout (callback) {
    // Revoke current tokens
    this.revokeTokens(() => {
      // Delete tokens from chrome storage
      this.saveTokensInStorage({}, () => {
        console.debug('User is logged out')
        if (_.isFunction(callback)) {
          callback()
        }
      })
    })
  }

  revokeTokens (callback) {
    this.client.revokeToken(this.tokens.accessToken).then(() => {
      console.debug('Revoked token')
      this.tokens = {}
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }
}

export default HypothesisManagerOAuth
