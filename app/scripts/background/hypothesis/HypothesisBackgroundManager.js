import HypothesisClientBackground from './HypothesisClientBackground'
import HypothesisManagerOAuth from './HypothesisManagerOAuth'
import _ from 'lodash'

class HypothesisBackgroundManager {
  constructor () {
    // Define token
    this.token = null
    // Hypothesis oauth manager
    this.hypothesisManagerOAuth = null
    this.annotationServerManager = null
  }

  init () {
    this.hypothesisManagerOAuth = new HypothesisManagerOAuth()
    this.hypothesisManagerOAuth.init(() => {
      // Init hypothesis client manager
      this.initHypothesisClientBackground()
    })

    // Init hypothesis background manager, who listens to commands from contentScript
    this.initResponses()
  }

  retrieveHypothesisToken (callback) {
    if (this.hypothesisManagerOAuth.checkTokenIsExpired()) {
      this.hypothesisManagerOAuth.refreshHypothesisToken((err) => {
        if (err) {
          callback(new Error('Unable to retrieve token'))
        } else {
          callback(null, this.hypothesisManagerOAuth.tokens.accessToken)
        }
      })
    } else {
      callback(null, this.hypothesisManagerOAuth.tokens.accessToken)
    }
  }

  initHypothesisClientBackground () {
    this.annotationServerManager = new HypothesisClientBackground(this)
    this.annotationServerManager.init((err) => {
      if (err) {
        console.debug('Unable to initialize hypothesis client manager. Error: ' + err.message)
      }
    })
  }

  initResponses () {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.scope === 'hypothesisClient') {
        let promise = Promise.resolve()
        // Check if client is initialized correctly, otherwise, reload it again
        if (_.isNull(this.annotationServerManager.client)) {
          promise = new Promise((resolve) => {
            this.annotationServerManager.reloadClient(() => {
              resolve()
            })
          })
        }
        promise.then(() => {
          if (request.cmd === 'searchAnnotations') {
            this.annotationServerManager.client.searchAnnotations(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'getListOfGroups') {
            this.annotationServerManager.client.getListOfGroups(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'createNewAnnotation') {
            this.annotationServerManager.client.createNewAnnotation(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'createNewAnnotationsSequential') {
            this.annotationServerManager.client.createNewAnnotationsSequential(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'createNewAnnotationsParallel') {
            this.annotationServerManager.client.createNewAnnotationsParallel(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'createNewAnnotations') {
            this.annotationServerManager.client.createNewAnnotations(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'getUserProfile') {
            this.annotationServerManager.client.getUserProfile((err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'fetchAnnotation') {
            this.annotationServerManager.client.fetchAnnotation(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'updateAnnotation') {
            this.annotationServerManager.client.updateAnnotation(request.data.id, request.data.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'deleteAnnotation') {
            this.annotationServerManager.client.deleteAnnotation(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'deleteAnnotations') {
            this.annotationServerManager.client.deleteAnnotations(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'searchAnnotationsSequential') {
            this.annotationServerManager.client.searchAnnotationsSequential(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'searchBunchAnnotations') {
            this.annotationServerManager.client.searchBunchAnnotations(request.data.data, request.data.offset, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'createNewGroup') {
            this.annotationServerManager.client.createNewGroup(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'updateGroup') {
            this.annotationServerManager.client.updateGroup(request.data.groupId, request.data.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'fetchGroup') {
            this.annotationServerManager.client.fetchGroup(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          } else if (request.cmd === 'removeAMemberFromAGroup') {
            this.annotationServerManager.client.removeAMemberFromAGroup(request.data, (err, result) => {
              if (err) {
                sendResponse({ error: err })
              } else {
                sendResponse(result)
              }
            })
          }
        })
        return true
      }
    })
  }
}

export default HypothesisBackgroundManager
