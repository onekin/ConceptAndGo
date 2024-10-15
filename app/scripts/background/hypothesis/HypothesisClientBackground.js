import _ from 'lodash'
import HypothesisClient from 'hypothesis-api-client'
import AnnotationServerManager from '../AnnotationServerManager'

const reloadIntervalInSeconds = 1 // Reload the hypothesis client every 10 seconds

class HypothesisClientBackground extends AnnotationServerManager {
  constructor (manager) {
    super()
    this.manager = manager
    this.client = null
    this.hypothesisToken = null
    this.reloadInterval = null
    this.annotationServerMetadata = {
      annotationUrl: 'https://hypothes.is/api/annotations/',
      annotationServerUrl: 'https://hypothes.is/api',
      groupUrl: 'https://hypothes.is/groups/',
      userUrl: 'https://hypothes.is/users/'
    }
  }

  init (callback) {
    this.reloadClient(() => {
      // Start reloading of client
      this.reloadInterval = setInterval(() => {
        this.reloadClient()
      }, reloadIntervalInSeconds * 1000)
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }

  reloadClient (callback) {
    if (this.manager) {
      this.manager.retrieveHypothesisToken((err, token) => {
        if (err) {
          this.client = new HypothesisClient()
          this.hypothesisToken = null
        } else {
          this.client = new HypothesisClient(token)
          this.hypothesisToken = token
        }
        if (_.isFunction(callback)) {
          callback()
        }
      })
    }
  }

  isLoggedIn (callback) {
    if (_.isFunction(callback)) {
      if (this.manager.hypothesisManagerOAuth.tokens) {
        callback(null, _.isString(this.manager.hypothesisManagerOAuth.tokens.accessToken))
      }
    }
  }

  constructSearchUrl ({ groupId }) {
    return this.annotationServerMetadata.groupUrl + groupId
  }

  destroy (callback) {
    if (this.reloadInterval) {
      clearInterval(this.reloadInterval)
    }
    if (_.isFunction(callback)) {
      callback()
    }
  }
}

export default HypothesisClientBackground
