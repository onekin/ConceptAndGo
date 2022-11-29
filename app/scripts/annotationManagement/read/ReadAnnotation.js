import DOMTextUtils from '../../utils/DOMTextUtils'
// TODO const PDFTextUtils = require('../../utils/PDFTextUtils')
import LanguageUtils from '../../utils/LanguageUtils'
import Events from '../../Events'
import _ from 'lodash'
// import ColorUtils from '../../utils/ColorUtils'
import Annotation from '../Annotation'
import $ from 'jquery'
import HypothesisClientManager from '../../annotationServer/hypothesis/HypothesisClientManager'
import Neo4JClientManager from '../../annotationServer/neo4j/Neo4JClientManager'
import Linking from '../purposes/linking/Linking'
import Classifying from '../../annotationManagement/purposes/Classifying'
const ANNOTATIONS_UPDATE_INTERVAL_IN_SECONDS = 5
const ANNOTATION_OBSERVER_INTERVAL_IN_SECONDS = 3
require('jquery-contextmenu/dist/jquery.contextMenu')

class ReadAnnotation {
  constructor () {
    this.events = {}
  }

  init (callback) {
    // Event listener created annotation
    this.initAnnotationCreatedEventListener()
    // Event listener deleted annotation
    this.initAnnotationDeletedEventListener()
    // Event listener deleted annotations
    this.initAnnotationsDeletedEventListener()
    // Event listener updated annotation
    this.loadAnnotations((err) => {
      if (_.isFunction(callback)) {
        callback(err)
      }
    })
    this.initCodebookUpdatedEventListener()
    this.initAnnotationsObserver()
    // TODO Check if client manager is remote
    if (LanguageUtils.isInstanceOf(window.abwa.annotationServerManager, HypothesisClientManager) || LanguageUtils.isInstanceOf(window.abwa.annotationServerManager, Neo4JClientManager)) {
      this.initReloadAnnotationsEvent()
    }
  }

  destroy () {
    // Remove event listeners
    const events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
    // Destroy annotations observer
    clearInterval(this.observerInterval)
    // Destroy annotations reload interval
    if (this.reloadInterval) {
      clearInterval(this.reloadInterval)
    }
    // Destroy annotations clean interval if exist
    clearInterval(this.cleanInterval)
  }


  initReloadAnnotationsEvent (callback) {
    this.reloadInterval = setInterval(() => {
      this.updateAllAnnotations(() => {
        console.debug('annotations updated')
      })
    }, ANNOTATIONS_UPDATE_INTERVAL_IN_SECONDS * 1000)
    if (_.isFunction(callback)) {
      callback()
    }
  }


  /**
   * Initializes annotations observer, to ensure dynamic web pages maintain highlights on the screen
   * @param callback Callback when initialization finishes
   */
  initAnnotationsObserver (callback) {
    this.observerInterval = setInterval(() => {
      // console.debug('Observer interval')
      let annotationsToHighlight
      annotationsToHighlight = this.allAnnotations
      if (annotationsToHighlight) {
        for (let i = 0; i < this.allAnnotations.length; i++) {
          const annotation = this.allAnnotations[i]
          // Search if annotation exist
          const element = document.querySelector('[data-annotation-id="' + annotation.id + '"]')
          // If annotation doesn't exist, try to find it
          if (!_.isElement(element)) {
            Promise.resolve().then(() => { this.highlightAnnotation(annotation) })
          }
        }
      }
    }, ANNOTATION_OBSERVER_INTERVAL_IN_SECONDS * 1000)
    // TODO Improve the way to highlight to avoid this interval (when search in PDFs it is highlighted empty element instead of element)
    this.cleanInterval = setInterval(() => {
      // console.debug('Clean interval')
      const highlightedElements = document.querySelectorAll('.highlightedAnnotation')
      highlightedElements.forEach((element) => {
        if (element.innerText === '') {
          $(element).remove()
        }
      })
    }, ANNOTATION_OBSERVER_INTERVAL_IN_SECONDS * 1000)
    // Callback
    if (_.isFunction(callback)) {
      callback()
    }
  }

  initAnnotationCreatedEventListener (callback) {
    this.events.annotationCreatedEvent = { element: document, event: Events.annotationCreated, handler: this.createdAnnotationHandler() }
    this.events.annotationCreatedEvent.element.addEventListener(this.events.annotationCreatedEvent.event, this.events.annotationCreatedEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  createdAnnotationHandler () {
    return (event) => {
      const annotation = event.detail.annotation
      // Add to all annotations list
      this.allAnnotations.push(annotation)
      // If annotation is linking annotation, add to linking annotation list
      if (annotation.body.purpose === 'linking') {
        this.linkingAnnotations.push(annotation)
      }
      // Dispatch annotations updated event
      LanguageUtils.dispatchCustomEvent(Events.updatedAllAnnotations, { annotations: this.allAnnotations })
      // Highlight annotation
      this.highlightAnnotation(annotation)
    }
  }

  initAnnotationDeletedEventListener (callback) {
    this.events.annotationDeletedEvent = { element: document, event: Events.annotationDeleted, handler: this.deletedAnnotationHandler() }
    this.events.annotationDeletedEvent.element.addEventListener(this.events.annotationDeletedEvent.event, this.events.annotationDeletedEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  initAnnotationsDeletedEventListener (callback) {
    this.events.annotationsDeletedEvent = { element: document, event: Events.annotationsDeleted, handler: this.deletedAnnotationsHandler() }
    this.events.annotationsDeletedEvent.element.addEventListener(this.events.annotationsDeletedEvent.event, this.events.annotationsDeletedEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  deletedAnnotationHandler () {
    return (event) => {
      const annotation = event.detail.annotation
      // Remove annotation from allAnnotations
      _.remove(this.allAnnotations, (currentAnnotation) => {
        return currentAnnotation.id === annotation.id
      })
      // Dispatch annotations updated event
      LanguageUtils.dispatchCustomEvent(Events.updatedAllAnnotations, { annotations: this.allAnnotations })
      this.unHighlightAnnotation(annotation)
    }
  }

  deletedAnnotationsHandler () {
    return (event) => {
      let annotations = event.detail.annotations
      for (let i = 0; i < annotations.length; i++) {
        let annotation = annotations[i]
        // Remove annotation from allAnnotations
        _.remove(this.allAnnotations, (currentAnnotation) => {
          return currentAnnotation.id === annotation.id
        })
        _.remove(this.groupLinkingAnnotations, (currentAnnotation) => {
          return currentAnnotation.id === annotation.id
        })
        this.unHighlightAnnotation(annotation)
      }
      // Dispatch annotations updated event
      LanguageUtils.dispatchCustomEvent(Events.updatedAllAnnotations, { annotations: this.allAnnotations })
    }
  }

  updateAllAnnotations (callback) {
    // Retrieve annotations for current url and group
    window.abwa.annotationServerManager.client.searchAnnotations({
      group: window.abwa.groupSelector.currentGroup.id,
      order: 'asc'
    }, (err, annotationObjects) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
      } else {
        // this.annotationObjects = annotationObjects.map(annotationObject => Annotation.deserialize(annotationObject))
        let currentResourceAnnotations = _.filter(annotationObjects, (annotationObject) => {
          return annotationObject.uri === window.abwa.targetManager.getDocumentURIToSaveInAnnotationServer()
        })
        this.allGroupAnnotations = annotationObjects.map(annotationObject => Annotation.deserialize(annotationObject))
        this.allAnnotations = currentResourceAnnotations.map(currentResourceAnnotation => Annotation.deserialize(currentResourceAnnotation))
        this.groupLinkingAnnotations = _.filter(this.allGroupAnnotations, (annotation) => {
          if (annotation.body.length > 0) {
            return LanguageUtils.isInstanceOf(annotation.body[0], Linking)
          }
        })
        this.groupClassifiyingAnnotations = _.filter(this.allGroupAnnotations, (annotation) => {
          if (annotation.body.length > 0) {
            return LanguageUtils.isInstanceOf(annotation.body[0], Classifying)
          }
        })
        // Redraw all annotations
        this.redrawAnnotations()
        LanguageUtils.dispatchCustomEvent(Events.updatedAllAnnotations, { annotations: this.allAnnotations })
        if (_.isFunction(callback)) {
          callback(null, this.allAnnotations)
        }
      }
    })
  }

  loadAnnotations (callback) {
    this.updateAllAnnotations((err) => {
      if (err) {
        if (_.isFunction(callback)) {
          callback(err)
        }
        // TODO Show user no able to load all annotations
        console.error('Unable to load annotations')
      } else {
        let unHiddenAnnotations
        unHiddenAnnotations = this.allAnnotations
        // If annotations have a selector, are highlightable in the target
        this.highlightAnnotations(unHiddenAnnotations)
        if (_.isFunction(callback)) {
          callback()
        }
      }
    })
  }

  retrieveCurrentAnnotations () {
    let currentAnnotations
    currentAnnotations = this.allAnnotations
    return currentAnnotations
  }

  highlightAnnotations (annotations, callback) {
    const promises = []
    annotations.forEach(annotation => {
      promises.push(new Promise((resolve) => {
        this.highlightAnnotation(annotation, resolve)
      }))
    })
    Promise.all(promises).then(() => {
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }

  highlightAnnotation (annotation, callback) {
    // Check if has selector to highlight, otherwise return
    if (!_.isObject(annotation.target[0].selector)) {
      if (_.isFunction(callback)) {
        callback()
      }
      return
    }
    // Check if swal is opened, it is not required to reload annotations if it is opened, and it loses the focus in a form
    if (document.querySelector('.swal2-container') === null) { // TODO Look for a better solution...
      // Get annotation color for an annotation
      let color
      // Annotation color is based on codebook color
      // Get annotated code id
      const bodyWithClassifyingPurpose = annotation.getBodyForPurpose('classifying')
      if (bodyWithClassifyingPurpose) {
        const codeOrTheme = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(bodyWithClassifyingPurpose.value.id)
        if (codeOrTheme) {
          color = codeOrTheme.color
        } else {
          const ColorUtils = require('../../utils/ColorUtils').default
          color = ColorUtils.getDefaultColor()
        }
      } else {
        const ColorUtils = require('../../utils/ColorUtils').default
        color = ColorUtils.getDefaultColor()
      }
      // Annotation color is based on codebook color
      // Get annotated code id
      let bodyWithLinkingPurpose = annotation.getBodyForPurpose('linking')
      if (bodyWithLinkingPurpose) {
        const ColorUtils = require('../../utils/ColorUtils').default
        color = ColorUtils.getDefaultColor()
      }
      // Get the tooltip text for the annotation
      const tooltip = this.generateTooltipFromAnnotation(annotation)
      // Draw the annotation in DOM
      try {
        const highlightedElements = DOMTextUtils.highlightContent({
          selectors: annotation.target[0].selector,
          className: 'highlightedAnnotation',
          id: annotation.id,
          format: window.abwa.targetManager.documentFormat
        })
        // Highlight in same color as button
        highlightedElements.forEach(highlightedElement => {
          // If need to highlight, set the color corresponding to, in other case, maintain its original color
          highlightedElement.style.backgroundColor = color
          // Set purpose color
          highlightedElement.dataset.color = color
          // Set a tooltip that is shown when user mouseover the annotation
          highlightedElement.title = tooltip
        })
        // FeatureComment: if annotation is mutable, update or delete, the mechanism is a context menu
        // Create context menu event for highlighted elements
        this.createContextMenuForAnnotation(annotation)
      } catch (e) {
        // Handle error
        if (_.isFunction(callback)) {
          callback(new Error('Element not found'))
        }
      } finally {
        if (_.isFunction(callback)) {
          callback()
        }
      }
    } else {
      if (_.isFunction(callback)) {
        callback()
      }
    }
  }

  unHighlightAnnotation (annotation) {
    DOMTextUtils.unHighlightElements([...document.querySelectorAll('[data-annotation-id="' + annotation.id + '"]')])
  }

  generateTooltipFromAnnotation (annotation) {
    let tooltipString = ''
    tooltipString += 'User: ' + annotation.creator.replace(window.abwa.annotationServerManager.annotationServerMetadata.userUrl, '') + '\n'
    annotation.body.forEach((body) => {
      if (body) {
        tooltipString += body.tooltip() + '\n'
      }
    })
    return tooltipString
  }

  createContextMenuForAnnotation (annotation) {
    $.contextMenu({
      selector: '[data-annotation-id="' + annotation.id + '"]',
      build: () => {
        // Create items for context menu
        const items = {}
        // If current user is the same as author, allow to remove annotation or add a comment
        if (annotation.creator === window.abwa.groupSelector.getCreatorData()) {
          // Check if somebody has replied
          items.delete = { name: 'Delete' }
        } else {
          // Currently there is nothing to do
        }
        return {
          callback: (key, opt) => {
            if (key === 'delete') {
              LanguageUtils.dispatchCustomEvent(Events.deleteAnnotation, {
                annotation: annotation
              })
            }/*  *//*  */
          },
          items: items
        }
      }
    })
  }


  redrawAnnotations (callback) {
    if (document.querySelector('.swal2-container') === null) { // TODO Look for a better solution...
      // Unhighlight all annotations
      this.unHighlightAllAnnotations()
      // Highlight all annotations
      this.highlightAnnotations(this.allAnnotations)
    }
  }

  unHighlightAllAnnotations () {
    // Remove created annotations
    const highlightedElements = [...document.querySelectorAll('[data-annotation-id]')]
    DOMTextUtils.unHighlightElements(highlightedElements)
  }

  createDoubleClickEventHandler (annotation) {
    const highlights = document.querySelectorAll('[data-annotation-id="' + annotation.id + '"]')
    for (let i = 0; i < highlights.length; i++) {
      const highlight = highlights[i]
      highlight.addEventListener('dblclick', () => {
        this.openCommentingForm(annotation)
      })
    }
  }


  initCodebookUpdatedEventListener (callback) {
    this.events.codebookUpdated = { element: document, event: Events.codebookUpdated, handler: this.createCodebookUpdatedEventHandler() }
    this.events.codebookUpdated.element.addEventListener(this.events.codebookUpdated.event, this.events.codebookUpdated.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  createCodebookUpdatedEventHandler () {
    return () => {
      // Reload annotations
      this.updateAllAnnotations(() => {
        console.debug('annotations updated')
      })
    }
  }
}

export default ReadAnnotation
