import TextUtils from './utils/URLUtils'
import Config from './Config'
import HypothesisClientManager from './annotationServer/hypothesis/HypothesisClientManager'
import _ from 'lodash'

class ScienceDirectContentScript {
  init () {
    // Get if this tab has an annotation to open and a doi
    const params = TextUtils.extractHashParamsFromUrl(window.location.href)
    if (!_.isEmpty(params) && !_.isEmpty(params[Config.namespace])) {
      // Activate the extension
      chrome.runtime.sendMessage({ scope: 'extension', cmd: 'activatePopup' }, (result) => {
        // Retrieve if annotation is done in current url or in pdf version
        this.loadAnnotationServer(() => {
          window.scienceDirect.annotationServerManager.client.fetchAnnotation(params[Config.namespace], (err, annotation) => {
            if (err) {
              console.error(err)
            } else {
              // TODO Check if annotation is from this page
            }
          })
        })
      })
    }
  }

  loadAnnotationServer (callback) {
    window.scienceDirect.annotationServerManager = new HypothesisClientManager()
    window.scienceDirect.annotationServerManager.init((err) => {
      if (_.isFunction(callback)) {
        if (err) {
          callback(err)
        } else {
          callback()
        }
      }
    })
  }
}

window.scienceDirect = {}
window.scienceDirect.scienceDirectContentScript = new ScienceDirectContentScript()
window.scienceDirect.scienceDirectContentScript.init()
