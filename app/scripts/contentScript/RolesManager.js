import _ from 'lodash'
import jsYaml from 'js-yaml'
import Config from '../Config'

class RolesManager {
  constructor () {
    this.role = RolesManager.roles.consumer
  }

  init (callback) {
    // Enable different functionality if current user is the teacher or student
    this.currentUserIsProducer((err, isProducer) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        if (isProducer) { // Open modes
          this.role = RolesManager.roles.producer
        } else {
          this.role = RolesManager.roles.consumer
        }
        if (_.isFunction(callback)) {
          callback()
        }
      }
    })
  }

  currentUserIsProducer (callback) {
    window.abwa.annotationServerManager.client.searchAnnotations({
      url: window.abwa.groupSelector.currentGroup.links.html,
      order: 'desc',
      tags: Config.namespace + ':' + Config.tags.producer
    }, (err, annotations) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        if (annotations.length > 0) {
          let params = {}
          try {
            params = jsYaml.load(annotations[0].text)
          } catch (e) {
            console.warn('Unable to parse producer annotation text as YAML: ' + e.message)
          }
          callback(null, params.producerId === window.abwa.groupSelector.user.userid) // Return if current user is producer
        } else {
          if (_.isFunction(callback)) {
            callback(null)
          }
        }
      }
    })
  }

  destroy () {
    // TODO Destroy managers
    this.role = null
  }
}

RolesManager.roles = {
  producer: 'teacher',
  consumer: 'student'
}

export default RolesManager
