import _ from 'lodash'
import TargetManager from '../target/TargetManager'
import Sidebar from './Sidebar'
import CodebookManager from '../codebook/CodebookManager'
import Config from '../Config'
import AnnotationBasedInitializer from './AnnotationBasedInitializer'
import { MapContentManager } from './MapContentManager'
import Events from '../Events'

class ContentScriptManager {
  constructor () {
    this.events = {}
    this.status = ContentScriptManager.status.notInitialized
  }

  init () {
    console.debug('Initializing content script manager')
    this.status = ContentScriptManager.status.initializing
    this.loadTargetManager(() => {
      this.loadAnnotationServer(() => {
        window.abwa.sidebar = new Sidebar()
        window.abwa.sidebar.init(() => {
          window.abwa.annotationBasedInitializer = new AnnotationBasedInitializer()
          window.abwa.annotationBasedInitializer.init(() => {
            const GroupSelector = require('../groupManipulation/GroupSelector').default
            window.abwa.groupSelector = new GroupSelector()
            window.abwa.groupSelector.init(() => {
              // Reload for first time the content by group
              this.reloadContentByGroup()
              // Initialize listener for group change to reload the content
              this.initListenerForGroupChange()
            })
          })
        })
      })
    })
  }

  initListenerForGroupChange () {
    this.events.groupChangedEvent = { element: document, event: Events.groupChanged, handler: this.groupChangedEventHandlerCreator() }
    this.events.groupChangedEvent.element.addEventListener(this.events.groupChangedEvent.event, this.events.groupChangedEvent.handler, false)
  }

  groupChangedEventHandlerCreator () {
    return (event) => {
      this.reloadContentByGroup()
    }
  }

  reloadContentByGroup (callback) {
    // TODO Use async await or promises
    this.reloadCodebookManager()
      .then(() => {
        return this.reloadToolset()
      })
      .then(() => {
        return this.reloadAnnotationManagement()
      })
      .then(() => {
        return this.reloadMapContentManager()
      })
      .then(() => {
        return this.reloadAnnotatedContentManager()
      })
      .then(() => {
        this.status = ContentScriptManager.status.initialized
        console.debug('Initialized content script manager')
      })
  }

  reloadAnnotatedContentManager () {
    return new Promise((resolve, reject) => {
      // Destroy annotated content manager
      this.destroyAnnotatedContentManager()
      // Create a new annotated content manager
      const { AnnotatedContentManager } = require('./AnnotatedContentManager')
      window.abwa.annotatedContentManager = new AnnotatedContentManager()
      window.abwa.annotatedContentManager.init((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  reloadAnnotationManagement () {
    return new Promise((resolve, reject) => {
      // Destroy current content annotator
      this.destroyAnnotationManagement()
      // Create a new content annotator for the current group
      const AnnotationManagement = require('../annotationManagement/AnnotationManagement').default
      window.abwa.annotationManagement = new AnnotationManagement()
      window.abwa.annotationManagement.init((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  reloadCodebookManager () {
    return new Promise((resolve, reject) => {
      // Destroy current tag manager
      this.destroyCodebookManager()
      // Create a new tag manager for the current group
      window.abwa.codebookManager = new CodebookManager(Config.namespace, Config.tags) // TODO Depending on the type of annotator
      window.abwa.codebookManager.init((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  reloadMapContentManager () {
    return new Promise((resolve, reject) => {
      // Destroy current content annotator
      this.destroyMapContentManager()
      // Create a new content annotator for the current group
      window.abwa.mapContentManager = new MapContentManager()
      window.abwa.mapContentManager.init((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  reloadToolset () {
    return new Promise((resolve, reject) => {
      // Destroy toolset
      this.destroyToolset()
      // Create a new toolset
      const Toolset = require('./Toolset').default
      window.abwa.toolset = new Toolset()
      window.abwa.toolset.init((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  destroyMapContentManager () {
    // Destroy current map content
    if (!_.isEmpty(window.abwa.mapContentManager)) {
      window.abwa.mapContentManager.destroy()
    }
  }

  destroyCodebookManager () {
    if (!_.isEmpty(window.abwa.codebookManager)) {
      window.abwa.codebookManager.destroy()
    }
  }

  destroyAnnotatedContentManager () {
    if (window.abwa.annotatedContentManager) {
      window.abwa.annotatedContentManager.destroy()
    }
  }

  destroyToolset () {
    if (window.abwa.toolset) {
      window.abwa.toolset.destroy()
    }
  }

  destroy (callback) {
    console.debug('Destroying content script manager')
    this.destroyTargetManager(() => {
      this.destroyCodebookManager()
      this.destroyAnnotationManagement()
      this.destroyToolset()
      // TODO Destroy groupSelector, sidebar,
      window.abwa.groupSelector.destroy(() => {
        window.abwa.sidebar.destroy(() => {
          this.destroyAnnotationServer(() => {
            this.status = ContentScriptManager.status.notInitialized
            console.debug('Correctly destroyed content script manager')
            if (_.isFunction(callback)) {
              callback()
            }
          })
        })
      })
      document.removeEventListener(Events.groupChanged, this.events.groupChangedEvent)
    })
  }

  loadTargetManager (callback) {
    window.abwa.targetManager = new TargetManager()
    window.abwa.targetManager.init(() => {
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }

  destroyTargetManager (callback) {
    if (window.abwa.targetManager) {
      window.abwa.targetManager.destroy(() => {
        if (_.isFunction(callback)) {
          callback()
        }
      })
    }
  }

  loadAnnotationServer (callback) {
    const HypothesisClientManager = require('../annotationServer/hypothesis/HypothesisClientManager').default
    window.abwa.annotationServerManager = new HypothesisClientManager()
    window.abwa.annotationServerManager.init((err) => {
      if (_.isFunction(callback)) {
        if (err) {
          callback(err)
        } else {
          callback()
        }
      }
    })
  }

  destroyAnnotationServer (callback) {
    if (window.abwa.annotationServerManager) {
      window.abwa.annotationServerManager.destroy(callback)
    }
  }

  destroyAnnotationManagement (callback) {
    if (window.abwa.annotationManagement) {
      window.abwa.annotationManagement.destroy(callback)
    }
  }
}

ContentScriptManager.status = {
  initializing: 'initializing',
  initialized: 'initialized',
  notInitialized: 'notInitialized'
}

export default ContentScriptManager
