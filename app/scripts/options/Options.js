import Alerts from '../utils/Alerts'
import _ from 'lodash'
import $ from 'jquery'

class Options {
  init () {
    // TODO Restore form from CmapCloud credentials saved in storage
    let cmapCloudButton = document.querySelector('#checkCmapValues')
    chrome.runtime.sendMessage({ scope: 'cmapCloud', cmd: 'getCmapCloudUserData' }, (response) => {
      if (response.data) {
        let data = response.data
        if (data.userData.user && data.userData.password && data.userData.uid) {
          document.querySelector('#cmapCloudUserValue').value = data.userData.user
          document.querySelector('#cmapCloudPasswordValue').value = data.userData.password
          document.querySelector('#uidValue').innerHTML = 'You are logged in!'
          $('#cmapCloudUserValue').prop('readonly', true)
          $('#cmapCloudPasswordValue').prop('readonly', true)
          cmapCloudButton.innerHTML = 'Change user credentials'
        }
      }
    })
    // TODO Restore form from Sero credentials saved in storage
    let seroButton = document.querySelector('#checkSeroValues')
    chrome.runtime.sendMessage({ scope: 'sero', cmd: 'getSeroUserData' }, (response) => {
      if (response.data) {
        let data = response.data
        if (data.seroUserData.user && data.seroUserData.password) {
          document.querySelector('#seroUserValue').value = data.seroUserData.user
          document.querySelector('#seroPasswordValue').value = data.seroUserData.password
          document.querySelector('#seroValue').innerHTML = 'You are logged in!'
          $('#seroUserValue').prop('readonly', true)
          $('#seroPasswordValue').prop('readonly', true)
          seroButton.innerHTML = 'Change user credentials'
        }
      }
    })
    // CmapCloud button listener
    cmapCloudButton.addEventListener('click', () => {
      if (cmapCloudButton.innerHTML === 'Change user credentials') {
        $('#cmapCloudUserValue').prop('readonly', false)
        $('#cmapCloudPasswordValue').prop('readonly', false)
        document.querySelector('#checkCmapValues').innerHTML = 'Validate account'
      } else if (cmapCloudButton.innerHTML === 'Validate account') {
        let userInputToValidate = document.querySelector('#cmapCloudUserValue').value
        let passwordInputToValidate = document.querySelector('#cmapCloudPasswordValue').value
        this.checkCmapCloudValues(userInputToValidate, passwordInputToValidate)
      }
    })
    // Sero button listener
    seroButton.addEventListener('click', () => {
      if (seroButton.innerHTML === 'Change user credentials') {
        $('#seroUserValue').prop('readonly', false)
        $('#seroPasswordValue').prop('readonly', false)
        document.querySelector('#checkSeroValues').innerHTML = 'Validate account'
      } else if (seroButton.innerHTML === 'Validate account') {
        let userInputToValidate = document.querySelector('#seroUserValue').value
        let passwordInputToValidate = document.querySelector('#seroPasswordValue').value
        this.checkSeroValues(userInputToValidate, passwordInputToValidate)
      }
    })
    // Hypothesis login
    this.hypothesisConfigurationContainerElement = document.querySelector('#hypothesisConfigurationCard')
    this.hypothesisConfigurationContainerElement.querySelector('#hypothesisLogin').addEventListener('click', this.createHypothesisLoginEventHandler())
    this.hypothesisConfigurationContainerElement.querySelector('#hypothesisLogout').addEventListener('click', this.createHypothesisLogoutEventHandler())
    this.hypothesisConfigurationContainerElement.querySelector('#hypothesisLoggedInUsername').addEventListener('click', this.createDisplayHypothesisLoginInfoEventHandler())
    // Get token and username if logged in
    chrome.runtime.sendMessage({ scope: 'hypothesis', cmd: 'getToken' }, ({ token }) => {
      if (_.isString(token)) {
        this.hypothesisToken = token
        chrome.runtime.sendMessage({ scope: 'hypothesisClient', cmd: 'getUserProfile' }, (profile) => {
          document.querySelector('#hypothesisLoggedInUsername').innerText = profile.userid
        })
        this.hypothesisConfigurationContainerElement.querySelector('#hypothesisLoginContainer').setAttribute('aria-hidden', 'true')
      } else {
        this.hypothesisConfigurationContainerElement.querySelector('#hypothesisLoggedInContainer').setAttribute('aria-hidden', 'true')
      }
    })
  }

  showSelectedAnnotationServerConfiguration (selectedAnnotationServer) {
    // Hide all annotation server configurations
    const annotationServerConfigurationCards = document.querySelectorAll('.annotationServerConfiguration')
    annotationServerConfigurationCards.forEach((annotationServerConfigurationCard) => {
      annotationServerConfigurationCard.setAttribute('aria-hidden', 'true')
    })
    // Show corresponding selected annotationServer configuration card
    const selectedAnnotationServerConfigurationCard = document.querySelector('#' + selectedAnnotationServer + 'ConfigurationCard')
    if (_.isElement(selectedAnnotationServerConfigurationCard)) {
      selectedAnnotationServerConfigurationCard.setAttribute('aria-hidden', 'false')
    }
  }

  checkCmapCloudValues (user, password) {
    document.querySelector('#uidValue').className = 'textMessage'
    document.querySelector('#uidValue').innerHTML = 'Validating given credentials ... wait a moment please.'
    chrome.runtime.sendMessage({
      scope: 'cmapCloud',
      cmd: 'getUserUid',
      data: { user: user, password: password }
    }, (response) => {
      if (response.cmapCloudUserData) {
        if (response.cmapCloudUserData.uid) {
          document.querySelector('#uidValue').innerHTML = 'You are logged in!'
          $('#cmapCloudUserValue').prop('readonly', true)
          $('#cmapCloudPasswordValue').prop('readonly', true)
          document.querySelector('#checkCmapValues').innerHTML = 'Change user credentials'
        }
        // validated
      } else if (response.err) {
        // Not validated
        document.querySelector('#uidValue').className = 'errorMessage'
        document.querySelector('#uidValue').innerHTML = 'Incorrect username or password. Please try again.'
      }
    })
  }

  checkSeroValues (user, password) {
    document.querySelector('#seroUidValue').className = 'textMessage'
    document.querySelector('#seroUidValue').innerHTML = 'Validating given credentials ... wait a moment please.'
    chrome.runtime.sendMessage({
      scope: 'sero',
      cmd: 'login',
      data: { user: user, password: password }
    }, (response) => {
      if (response.seroUserData) {
        document.querySelector('#seroUidValue').innerHTML = 'You are logged in!'
        $('#seroUserValue').prop('readonly', true)
        $('#seroPasswordValue').prop('readonly', true)
        document.querySelector('#checkSeroValues').innerHTML = 'Change user credentials'
      } else if (response.err) {
        // Not validated
        document.querySelector('#seroUidValue').className = 'errorMessage'
        document.querySelector('#seroUidValue').innerHTML = 'Incorrect username or password. Please try again.'
      }
    })
  }

  createHypothesisLoginEventHandler () {
    return () => {
      chrome.runtime.sendMessage({
        scope: 'hypothesis',
        cmd: 'userLoginForm'
      }, ({ token }) => {
        this.hypothesisToken = token
        setTimeout(() => {
          chrome.runtime.sendMessage({ scope: 'hypothesisClient', cmd: 'getUserProfile' }, (profile) => {
            document.querySelector('#hypothesisLoggedInUsername').innerText = profile.userid
            document.querySelector('#hypothesisLoggedInContainer').setAttribute('aria-hidden', 'false')
          })
          document.querySelector('#hypothesisLoginContainer').setAttribute('aria-hidden', 'true')
        }, 1000) // Time before sending request, as background hypothes.is client refresh every second
      })
    }
  }

  createHypothesisLogoutEventHandler () {
    return () => {
      chrome.runtime.sendMessage({
        scope: 'hypothesis',
        cmd: 'userLogout'
      }, () => {
        document.querySelector('#hypothesisLoggedInContainer').setAttribute('aria-hidden', 'true')
        document.querySelector('#hypothesisLoginContainer').setAttribute('aria-hidden', 'false')
        this.hypothesisToken = 'Unknown'
        document.querySelector('#hypothesisLoggedInUsername').innerText = 'Unknown user'
      })
    }
  }

  createDisplayHypothesisLoginInfoEventHandler () {
    return () => {
      Alerts.infoAlert({
        title: 'You are logged in Hypothes.is',
        text: 'Token: ' + window.options.hypothesisToken
      })
    }
  }
}

export default Options
