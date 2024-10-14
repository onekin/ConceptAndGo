import DOI from 'doi-regex'
import URLUtils from '../utils/URLUtils'
import Config from '../Config'
import _ from 'lodash'

class TargetManager {
  constructor () {
    this.doiUrlFilterObject = { urls: ['*://*.doi.org/*', '*://doi.org/*'] }
    this.scienceDirect = { urls: ['*://www.sciencedirect.com/science/article/pii/*'] }
    this.dropbox = { urls: ['*://www.dropbox.com/s/*?raw=1*'] }
    this.dropboxContent = { urls: ['*://*.dropboxusercontent.com/*'] }
    this.tabs = {}
  }

  init () {
    // Requests to doi.org
    chrome.webRequest.onHeadersReceived.addListener((responseDetails) => {
      console.debug(responseDetails)
      const locationIndex = _.findIndex(responseDetails.responseHeaders, (header) => header.name === 'location')
      const locationUrl = responseDetails.responseHeaders[locationIndex].value
      try {
        const redirectUrl = new URL(locationUrl)
        // Retrieve doi from call
        let doi = ''
        if (_.isArray(DOI.groups(responseDetails.url))) {
          doi = DOI.groups(responseDetails.url)[1]
        }
        const annotationId = this.extractAnnotationId(responseDetails.url)
        if (doi) {
          if (_.isEmpty(redirectUrl.hash)) {
            redirectUrl.hash += '#doi:' + doi
          } else {
            redirectUrl.hash += '&doi:' + doi
          }
        }
        if (annotationId) {
          if (_.isEmpty(redirectUrl.hash)) {
            redirectUrl.hash += '#' + Config.urlParamName + ':' + annotationId
          } else {
            redirectUrl.hash += '&' + Config.urlParamName + ':' + annotationId
          }
        }
        responseDetails.responseHeaders[locationIndex].value = redirectUrl.toString()
        this.tabs[responseDetails.tabId] = { doi: doi, annotationId: annotationId }
        return { responseHeaders: responseDetails.responseHeaders }
      } catch (e) {
        return { responseHeaders: responseDetails.responseHeaders }
      }
    }, this.doiUrlFilterObject, ['responseHeaders', 'blocking'])
    // Requests to sciencedirect, redirection from linkinghub.elsevier.com (parse doi and annotation hash param if present)
    /* chrome.webRequest.onBeforeSendHeaders.addListener((requestHeaders) => {
      const referer = _.find(requestHeaders.requestHeaders, (requestHeader) => { return requestHeader.name === 'Referer' })
      if (referer && referer.value.includes('linkinghub.elsevier.com')) {
        chrome.tabs.get(requestHeaders.tabId, (tab) => {
          let doi = null
          let annotationId = null
          const url = tab.url
          // Retrieve doi
          const doiGroups = DOI.groups(url)
          if (doiGroups && doiGroups[1]) {
            doi = doiGroups[1]
            doi = doi.split('&' + Config.urlParamName)[0] // If doi-regex inserts also the annotation hash parameter, remove it, is not part of the doi
          }
          const params = URLUtils.extractHashParamsFromUrl(url)
          if (params && params[Config.urlParamName]) {
            annotationId = params[Config.urlParamName]
          }
          console.debug(requestHeaders)
          if (doi && annotationId) {
            const redirectUrl = requestHeaders.url + '#doi:' + doi + '&' + Config.urlParamName + ':' + annotationId
            chrome.tabs.update(requestHeaders.tabId, { url: redirectUrl })
          } else if (doi) {
            const redirectUrl = requestHeaders.url + '#doi:' + doi
            chrome.tabs.update(requestHeaders.tabId, { url: redirectUrl })
          } else if (annotationId) {
            const redirectUrl = requestHeaders.url + '#' + Config.urlParamName + ':' + annotationId
            chrome.tabs.update(requestHeaders.tabId, { url: redirectUrl })
          }
        })
      }
    }, this.scienceDirect, ['requestHeaders', 'blocking', 'extraHeaders']) */
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url.includes('linkinghub.elsevier.com')) {
        let doi = null
        let annotationId = null
        const url = tab.url

        // Retrieve DOI using regex or a DOI utility
        const doiGroups = DOI.groups(url)
        if (doiGroups && doiGroups[1]) {
          doi = doiGroups[1]
          doi = doi.split('&' + Config.urlParamName)[0] // Clean up DOI
        }

        // Extract annotationId from URL if present
        const params = URLUtils.extractHashParamsFromUrl(url)
        if (params && params[Config.urlParamName]) {
          annotationId = params[Config.urlParamName]
        }

        let redirectUrl = tab.url
        if (doi && annotationId) {
          redirectUrl = `${tab.url}#doi:${doi}&${Config.urlParamName}:${annotationId}`
        } else if (doi) {
          redirectUrl = `${tab.url}#doi:${doi}`
        } else if (annotationId) {
          redirectUrl = `${tab.url}#${Config.urlParamName}:${annotationId}`
        }

        // If the URL needs to be updated, redirect the tab
        if (redirectUrl !== tab.url) {
          chrome.tabs.update(tabId, { url: redirectUrl })
        }
      }
    })
    // Request to dropbox
    chrome.webRequest.onHeadersReceived.addListener((responseDetails) => {
      this.tabs[responseDetails.tabId] = {
        url: responseDetails.url.split('#')[0],
        annotationId: this.extractAnnotationId(responseDetails.url)
      }
    }, this.dropbox, ['responseHeaders', 'blocking'])
    // Request dropbox pdf files
    /* chrome.webRequest.onBeforeSendHeaders.addListener((details) => {
      const index = _.findIndex(details.requestHeaders, (header) => { return header.name.toLowerCase() === 'accept' })
      details.requestHeaders[index].value = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*//*;q=0.8'
      return { requestHeaders: details.requestHeaders }
    }, this.dropboxContent, ['blocking', 'requestHeaders']) */

    chrome.webRequest.onCompleted.addListener((details) => {
      if (this.tabs[details.tabId]) {
        chrome.tabs.sendMessage(details.tabId, this.tabs[details.tabId])
      }
    }, this.dropboxContent)
  }

  extractAnnotationId (url) {
    if (url.includes('#')) {
      const parts = url.split('#')[1].split(':')
      if (parts[0] === Config.urlParamName) {
        return parts[1] || null
      }
    } else {
      return null
    }
  }
}

export default TargetManager
