import _ from 'lodash'
import Events from '../Events'
import PDF from './formats/PDF'
import TXT from './formats/TXT'
import HTML from './formats/HTML'
import URLUtils from '../utils/URLUtils'
import LanguageUtils from '../utils/LanguageUtils'
import Alerts from '../utils/Alerts'
import RandomUtils from '../utils/RandomUtils'
import CryptoUtils from '../utils/CryptoUtils'
const URL_CHANGE_INTERVAL_IN_SECONDS = 5

class TargetManager {
  constructor () {
    this.url = null
    this.urlChangeInterval = null
    this.urlParam = null
    this.documentId = null
    this.documentTitle = ''
    this.fileName = ''
    this.documentFormat = HTML // By default document type is html
    this.localFile = false
  }

  init (callback) {
    if (document.querySelector('embed[type="application/pdf"]')) {
      window.location = chrome.extension.getURL('content/pdfjs/web/viewer.html') + '?file=' + encodeURIComponent(window.location.href)
    } else if (this.isPlainTextFile()) {
      window.location = chrome.extension.getURL('content/plainTextFileViewer/index.html') + '?file=' + encodeURIComponent(window.location.href)
    } else {
      this.reloadTargetInformation(() => {
        if (_.isFunction(callback)) {
          callback()
        }
      })
    }
  }

  reloadTargetInformation (callback) {
    // Try to load doi from the document, page metadata or URL hash param
    this.tryToLoadDoi()
    this.tryToLoadPublicationPDF()
    this.tryToLoadURLParam()
    this.loadDocumentFormat().catch((err) => {
      Alerts.errorAlert({ title: 'Not supported document format', text: err.message })
    }).then(() => {
      this.tryToLoadTitle()
      this.tryToLoadURL()
      this.tryToLoadURN()
      this.tryToLoadTargetId()
      let promise
      promise = Promise.resolve()
      promise.then(() => {
        this.tryToLoadFileName()
        if (this.url.startsWith('file:///')) {
          this.localFile = true
        } else if (this.documentFormat !== PDF && !this.localFile) { // If document is not pdf, it can change its URL
          // Support in ajax websites web url change, web url can change dynamically, but local files never do
          this.initSupportWebURLChange()
        }
        if (_.isFunction(callback)) {
          callback()
        }
      }).catch((err) => {
        Alerts.errorAlert({ text: 'Unexpected error: ' + err.message })
      })
    })
  }

  tryToLoadURN () {
    // If document is PDF
    if (this.documentFormat === PDF) {
      this.fingerprint = window.PDFViewerApplication.pdfDocument.pdfInfo.fingerprint
      this.urn = 'urn:x-pdf:' + this.fingerprint
    } else {
      // If document is plain text
      this.fingerprint = this.tryToLoadPlainTextFingerprint()
      if (this.fingerprint) {
        this.urn = 'urn:x-txt:' + this.fingerprint
      }
    }
  }

  tryToLoadTargetId () {
    // Wait until updated all annotations is loaded
    this.targetIdEventListener = document.addEventListener(Events.updatedAllAnnotations, () => {
      if (window.abwa.annotationManagement.annotationReader.allAnnotations.length > 0) {
        this.documentId = window.abwa.annotationManagement.annotationReader.allAnnotations[0].target[0].source.id
      } else {
        this.documentId = RandomUtils.randomString()
      }
    })
  }

  tryToLoadURL () {
    if (this.urlParam) {
      this.url = this.urlParam
    } else {
      this.url = this.getDocumentURL()
    }
  }

  getDocumentURL () {
    if (this.documentFormat === PDF) {
      return window.PDFViewerApplication.url
    } else {
      return URLUtils.retrieveMainUrl(window.location.href) // TODO Check this, i think this url is not valid
    }
  }

  /**
   * Resolves which format
   * @returns {Promise<unknown>}
   */
  loadDocumentFormat () {
    return new Promise((resolve, reject) => {
      if (window.location.pathname === '/content/pdfjs/web/viewer.html') {
        this.documentFormat = PDF
        this.waitUntilPDFViewerLoad(() => {
          resolve()
        })
        return true
      } /*  */else if ((document.body && document.body.children.length === 1 && document.body.children[0].nodeName === 'PRE') || window.location.pathname === '/content/plainTextFileViewer/index.html') { // TODO Check if document is loaded in content/plainTextFileViewer
        // TODO Check if document.body is loaded or not yet
        this.documentFormat = TXT
        resolve()
      } /*  */else {
        this.documentFormat = HTML
        if (_.isEmpty(this.documentFormat)) {
          reject(new Error('Unable to identify document format. Probably, this document format is not supported by the tool.'))
        } else {
          resolve()
        }
      }
    })
  }

  destroy (callback) {
    if (this.documentFormat === PDF) {
      // Reload to original pdf website
      window.location.href = window.PDFViewerApplication.baseUrl
    }
    if (_.isFunction(callback)) {
      callback()
    }
    clearInterval(this.urlChangeInterval)
  }

  waitUntilPDFViewerLoad (callback) {
    const interval = setInterval(() => {
      if (_.isObject(window.PDFViewerApplication.pdfDocument)) {
        clearInterval(interval)
        if (_.isFunction(callback)) {
          callback(window.PDFViewerApplication)
        }
      }
    }, 500)
  }

  tryToLoadDoi () {
    // Try to load doi from hash param
    const decodedUri = decodeURIComponent(window.location.href)
    const params = URLUtils.extractHashParamsFromUrl(decodedUri)
    if (!_.isEmpty(params) && !_.isEmpty(params.doi)) {
      this.doi = decodeURIComponent(params.doi)
    }
    // Try to load doi from page metadata
    if (_.isEmpty(this.doi)) {
      try {
        this.doi = document.querySelector('meta[name="citation_doi"]').content
        if (!this.doi) {
          this.doi = document.querySelector('meta[name="dc.identifier"]').content
        }
      } catch (e) {
        console.debug('Doi not found for this document')
      }
    }
    // TODO Try to load doi from chrome tab storage
  }

  tryToLoadURLParam () {
    const decodedUri = decodeURIComponent(window.location.href)
    console.log(decodedUri)
    const params = URLUtils.extractHashParamsFromUrl(decodedUri, '::')
    console.log(params)
    if (!_.isEmpty(params) && !_.isEmpty(params.url)) {
      console.debug(params.url)
      this.urlParam = params.url
    }
  }

  tryToLoadPublicationPDF () {
    try {
      this.citationPdf = document.querySelector('meta[name="citation_pdf_url"]').content
    } catch (e) {
      console.debug('citation pdf url not found')
    }
  }

  getDocumentRootElement () {
    /*  */if (this.documentFormat === PDF) {
      return document.querySelector('#viewer')
    } /*  */
  }

  getDocumentURIToSearchInAnnotationServer () {
    // Searches are done using uri and url parameters that hypothes.is (and other annotation systems) supports.
    // This includes options in the search query this function and getDocumentURIToSaveInAnnotationServer.
    // As the second one prioritize resilient URLs, this function gives priority to URN
    /*  */if (this.documentFormat === PDF) {
      return this.urn
    } /*  */
  }

  getDocumentURIToSaveInAnnotationServer () {
    if (this.doi) {
      return 'https://doi.org/' + this.doi
    } else if (this.url) {
      return this.url
    } else if (this.urn) {
      return this.urn
    } else {
      throw new Error('Unable to retrieve any IRI for this document.')
    }
  }

  /**
   * Adds an observer which checks if the URL changes
   */
  initSupportWebURLChange () {
    if (_.isEmpty(this.urlChangeInterval)) {
      this.urlChangeInterval = setInterval(() => {
        const newUrl = this.getDocumentURL()
        if (newUrl !== this.url) {
          console.debug('Document URL updated from %s to %s', this.url, newUrl)
          this.url = newUrl
          // Reload target information
          this.reloadTargetInformation(() => {
            // Dispatch event
            LanguageUtils.dispatchCustomEvent(Events.updatedDocumentURL, { url: this.url })
          })
        }
      }, URL_CHANGE_INTERVAL_IN_SECONDS * 1000)
    }
  }

  tryToLoadPlainTextFingerprint () {
    const fileTextContentElement = document.querySelector('body > pre')
    if (fileTextContentElement) {
      const fileTextContent = fileTextContentElement.innerText
      return CryptoUtils.hash(fileTextContent)
    }
  }

  getDocumentURIs () {
    const uris = {}
    if (this.doi) {
      uris.doi = 'https://doi.org/' + this.doi
    }
    if (this.url) {
      uris.url = this.url
    }
    if (this.urn) {
      uris.urn = this.urn
    }
    if (this.citationPdf) {
      uris.citationPdf = this.citationPdf
    }
    return uris
  }

  getDocumentLink () {
    const uris = this.getDocumentURIs()
    return _.values(uris, (uri) => {
      return { href: uri }
    })
  }

  getDocumentFingerprint () {
    if (this.fingerprint) {
      return this.fingerprint
    }
  }

  isPlainTextFile () {
    let result = false
    if (window.location.pathname !== '/content/pdfjs/web/viewer.html') {
      if (document.querySelector('body').children.length === 1 && _.isElement(document.querySelector('body > pre'))) { // It is opened with default plain text viewer in chrome
        result = true
      } else {
        if (document.querySelector('#webkit-xml-viewer-source-xml')) { // It is loaded with default xml viewer
          result = true
        } else {
          if (window.location.pathname !== '/content/plainTextFileViewer/index.html') {
            const extension = window.location.href.split('.').pop().split(/#|\?/g)[0]
            result = 'xml,xsl,xslt,xquery,xsql,'.split(',').includes(extension)
          }
        }
      }
    }
    return result
  }

  tryToLoadTitle () {
    // Try to load by doi
    const promise = new Promise((resolve, reject) => {
      if (this.doi) {
        const settings = {
          async: true,
          crossDomain: true,
          url: 'https://doi.org/' + this.doi,
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }
        // Call using axios
        const axios = require('axios').default
        axios(settings).then((response) => {
          if (response.data && response.data.title) {
            this.documentTitle = response.data.title
          }
          resolve()
        })
      } else {
        resolve()
      }
    })
    promise.then(() => {
      // Try to load title from page metadata
      if (_.isEmpty(this.documentTitle)) {
        try {
          const documentTitleElement = document.querySelector('meta[name="citation_title"]')
          if (!_.isNull(documentTitleElement)) {
            this.documentTitle = documentTitleElement.content
          }
          if (!this.documentTitle) {
            const documentTitleElement = document.querySelector('meta[property="og:title"]')
            if (!_.isNull(documentTitleElement)) {
              this.documentTitle = documentTitleElement.content
            }
            if (!this.documentTitle) {
              const promise = new Promise((resolve, reject) => {
                // Try to load title from pdf metadata
                if (this.documentFormat === PDF) {
                  this.waitUntilPDFViewerLoad(() => {
                    if (window.PDFViewerApplication.documentInfo.Title) {
                      this.documentTitle = window.PDFViewerApplication.documentInfo.Title
                    }
                    resolve()
                  })
                } else {
                  resolve()
                }
              })
              promise.then(() => {
                // Try to load title from document title
                if (!this.documentTitle) {
                  this.documentTitle = document.title || 'Unknown document'
                }
              })
            }
          }
        } catch (e) {
          console.debug('Title not found for this document')
        }
      }
    })
  }

  /**
   * Returns id for target source
   * @returns String
   */
  getDocumentId () {
    return this.documentId || RandomUtils.randomString()
  }

  tryToLoadFileName () {
    // Get name from URL
    if (_.isEmpty(this.fileName) && this.url) {
      let filename = _.last(_.split((new URL(this.url)).pathname, '/'))
      if (!_.isEmpty(filename)) {
        this.fileName = filename
      }
    }
  }

}

export default TargetManager
