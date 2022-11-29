import Events from '../../../Events'
import Alerts from '../../../utils/Alerts'
import _ from 'lodash'
import $ from 'jquery'
import Config from '../../../Config'
import Theme from '../../model/Theme'
import Classifying from '../../../annotationManagement/purposes/Classifying'
import Annotation from '../../../annotationManagement/Annotation'
import LanguageUtils from '../../../utils/LanguageUtils'
import ImageUtilsOCR from '../../../utils/ImageUtilsOCR'


class UpdateCodebook {
  constructor () {
    this.events = {}
  }

  init () {
    // Add event listener for updateCodebook event
    this.initCreateThemeEvent()
    this.initRemoveThemeEvent()
    this.initUpdateThemeEvent()
  }

  destroy () {
    // Remove event listeners
    const events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
  }

  initCreateThemeEvent () {
    this.events.createThemeEvent = { element: document, event: Events.createTheme, handler: this.createNewThemeEventHandler() }
    this.events.createThemeEvent.element.addEventListener(this.events.createThemeEvent.event, this.events.createThemeEvent.handler, false)
  }

  initUpdateThemeEvent () {
    this.events.updateThemeEvent = { element: document, event: Events.updateTheme, handler: this.createUpdateThemeEventHandler() }
    this.events.updateThemeEvent.element.addEventListener(this.events.updateThemeEvent.event, this.events.updateThemeEvent.handler, false)
  }

  initRemoveThemeEvent (callback) {
    this.events.removeThemeEvent = { element: document, event: Events.removeTheme, handler: this.removeThemeEventHandler() }
    this.events.removeThemeEvent.element.addEventListener(this.events.removeThemeEvent.event, this.events.removeThemeEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  /**
   * This function adds a button in the sidebar that allows to create new themes.
   */
  static createNewThemeButton () {
    const newThemeButton = document.createElement('button')
    newThemeButton.innerText = 'New ' + Config.tags.grouped.group
    newThemeButton.id = 'newThemeButton'
    newThemeButton.className = 'tagButton codingElement'
    newThemeButton.addEventListener('click', async () => {
      let newTheme
      let target = window.abwa.annotationManagement.annotationCreator.obtainTargetToCreateAnnotation({})
      let retrievedThemeName = ''
      // Get user selected content
      let selection = document.getSelection()
      // If selection is child of sidebar, return null
      if (selection.anchorNode) {
        if ($(selection.anchorNode).parents('#annotatorSidebarWrapper').toArray().length !== 0 || selection.toString().length < 1) {
          if (selection.anchorNode.innerText) {
            retrievedThemeName = selection.anchorNode.innerText
          } else {
            if (selection.anchorNode.nodeName === 'IMG') {
              retrievedThemeName = await ImageUtilsOCR.getStringFromImage(selection.anchorNode)
            } else {
              if (selection.anchorNode.childNodes) {
                let childArray = Array.from(selection.anchorNode.childNodes)
                let imgChild = childArray.filter((node) => {
                  return node.nodeName === 'IMG'
                })
                if (imgChild[0]) {
                  retrievedThemeName = await ImageUtilsOCR.getStringFromImage(imgChild[0])
                }
              }
            }
          }
        } else {
          retrievedThemeName = selection.toString().trim().replace(/^\w/, c => c.toUpperCase())
        }
      }
      Alerts.multipleInputAlert({
        title: 'You are creating a new ' + Config.tags.grouped.group + ': ',
        html: '<input autofocus class="formCodeName swal2-input" type="text" id="themeName" placeholder="New ' + Config.tags.grouped.group + ' name" value="' + retrievedThemeName + '"/>' +
          '<textarea class="formCodeDescription swal2-textarea" data-minchars="1" data-multiple rows="6" id="themeDescription" placeholder="Please type a description that describes this ' + Config.tags.grouped.group + '..."></textarea>',
        preConfirm: () => {
          const themeNameElement = document.querySelector('#themeName')
          let themeName
          if (_.isElement(themeNameElement)) {
            themeName = themeNameElement.value
          }
          if (themeName.length > 0) {
            if (!this.themeNameExist(themeName)) {
              const themeDescriptionElement = document.querySelector('#themeDescription')
              let themeDescription
              if (_.isElement(themeDescriptionElement)) {
                themeDescription = themeDescriptionElement.value
              }
              newTheme = new Theme({
                name: themeName,
                description: themeDescription,
                annotationGuide: window.abwa.codebookManager.codebookReader.codebook
              })
            } else {
              const swal = require('sweetalert2')
              swal.showValidationMessage('There exist a ' + Config.tags.grouped.group + ' with the same name. Please select a different name.')
            }
          } else {
            const swal = require('sweetalert2')
            swal.showValidationMessage('Name cannot be empty.')
          }
        },
        callback: () => {
          LanguageUtils.dispatchCustomEvent(Events.createTheme, { theme: newTheme, target: target })
        },
        cancelCallback: () => {
          console.log('new theme canceled')
        }
      })
    })
    window.abwa.codebookManager.codebookReader.buttonContainer.append(newThemeButton)
  }

  static themeNameExist (newThemeName) {
    let themes = window.abwa.codebookManager.codebookReader.codebook.themes
    let theme = _.find(themes, (theme) => {
      return theme.name === newThemeName
    })
    if (theme) {
      return true
    } else {
      return false
    }
  }

  /**
   * This function creates a handler to create a new theme when it receives the createTheme event.
   * @return Event
   */
  createNewThemeEventHandler () {
    return (event) => {
      const newThemeAnnotation = event.detail.theme.toAnnotation()
      window.abwa.annotationServerManager.client.createNewAnnotation(newThemeAnnotation, (err, annotation) => {
        if (err) {
          Alerts.errorAlert({ text: 'Unable to create the new code. Error: ' + err.toString() })
        } else {
          LanguageUtils.dispatchCustomEvent(Events.themeCreated, { newThemeAnnotation: annotation, target: event.detail.target })
        }
      })
    }
  }

  /**
   * This function creates a handler to update a new theme when it receives the updateTheme event.
   * @return Event
   */
  createUpdateThemeEventHandler () {
    return (event) => {
      const theme = event.detail.theme
      let themeToUpdate
      // Show form to update theme
      Alerts.multipleInputAlert({
        title: 'You are updating the theme ' + theme.name,
        html: '<input autofocus class="formCodeName swal2-input" type="text" id="themeName" type="text" placeholder="New theme name" value="' + theme.name + '"/>' +
          '<textarea class="formCodeDescription swal2-textarea" data-minchars="1" data-multiple rows="6"  id="themeDescription" placeholder="Please type a description that describes this theme...">' + theme.description + '</textarea>',
        preConfirm: () => {
          const themeNameElement = document.querySelector('#themeName')
          let themeName
          if (_.isElement(themeNameElement)) {
            themeName = themeNameElement.value
          }
          const themeDescriptionElement = document.querySelector('#themeDescription')
          let themeDescription
          if (_.isElement(themeDescriptionElement)) {
            themeDescription = themeDescriptionElement.value
          }
          if (theme.isTopic) {
            themeToUpdate = new Theme({ name: themeName, description: themeDescription, isTopic: true, annotationGuide: window.abwa.codebookManager.codebookReader.codebook })
          } else {
            themeToUpdate = new Theme({ name: themeName, description: themeDescription, annotationGuide: window.abwa.codebookManager.codebookReader.codebook })
          }
          themeToUpdate.id = theme.id
        },
        callback: () => {
          // Update codebook
          this.updateCodebookTheme(themeToUpdate)
          // Update all annotations done with this theme
          this.updateAnnotationsWithTheme(themeToUpdate)
        },
        cancelCallback: () => {
          // showForm(preConfirmData)
        }
      })
    }
  }

  /**
   * This function creates a handler to remove a theme when it receives the removeTheme event.
   * @return Event
   */
  removeThemeEventHandler () {
    return (event) => {
      const theme = event.detail.theme
      // Ask user is sure to remove
      Alerts.confirmAlert({
        title: 'Removing ' + Config.tags.grouped.group + theme.name,
        text: 'Are you sure that you want to remove the ' + Config.tags.grouped.group + ' ' + theme.name + '. All dependant codes will be deleted too. You cannot undo this operation.',
        alertType: Alerts.alertType.warning,
        callback: () => {
          let annotationsToDelete = [theme.id]
          // Get theme codes id to be removed too
          const codesId = _.map(theme.codes, (code) => { return code.id })
          if (_.every(codesId, _.isString)) {
            annotationsToDelete = annotationsToDelete.concat(codesId)
          }
          // Get linking annotions made with removed theme
          let groupLinkingAnnotations = window.abwa.annotationManagement.annotationReader.groupLinkingAnnotations
          let linkingAnnotationToRemove = _.filter(groupLinkingAnnotations, (linkingAnnotation) => {
            let linkingBody = linkingAnnotation.body[0]
            return linkingBody.value.from.id === theme.id || linkingBody.value.to === theme.id
          })
          console.log(linkingAnnotationToRemove)
          let linkingsId = _.map(linkingAnnotationToRemove, (annotation) => { return annotation.id })
          if (_.every(linkingsId, _.isString)) {
            annotationsToDelete = annotationsToDelete.concat(linkingsId)
          }
          window.abwa.annotationServerManager.client.deleteAnnotations(annotationsToDelete, (err, result) => {
            if (err) {
              Alerts.errorAlert({ text: 'Unexpected error when deleting the code.' })
            } else {
              LanguageUtils.dispatchCustomEvent(Events.themeRemoved, { theme: theme })
            }
          })
        }
      })
    }
  }

  updateCodebookTheme (themeToUpdate, callback) {
    const annotationsToUpdate = themeToUpdate.toAnnotations()
    const updatePromises = annotationsToUpdate.map((annotation) => {
      return new Promise((resolve, reject) => {
        window.abwa.annotationServerManager.client.updateAnnotation(annotation.id, annotation, (err, annotation) => {
          if (err) {
            reject(err)
          } else {
            resolve()
          }
        })
      })
    })
    Promise
      .all(updatePromises)
      .catch((rejects) => {
        Alerts.errorAlert({ text: 'Unable to create the new code. Error: ' + rejects[0].toString() })
      }).then(() => {
        if (_.isFunction(callback)) {
          callback()
        }
        LanguageUtils.dispatchCustomEvent(Events.themeUpdated, { updatedTheme: themeToUpdate })
      })
  }

  updateAnnotationsWithTheme (theme) {
    // Get all the annotations done in the group with this theme
    const searchByTagPromise = (tag) => {
      return new Promise((resolve, reject) => {
        window.abwa.annotationServerManager.client.searchAnnotations({
          group: window.abwa.groupSelector.currentGroup.id,
          tags: [tag]
        }, (err, annotations) => {
          if (err) {
            reject(err)
          } else {
            resolve(annotations)
          }
        })
      })
    }
    const promises = [
      searchByTagPromise(Config.namespace + ':' + Config.tags.grouped.group + ':' + theme.name)
    ]
    Promise.all(promises).then((resolves) => {
      const annotationObjects = resolves[0] // Get annotations done
      let annotations = annotationObjects.map((annotation) => {
        try {
          return Annotation.deserialize(annotation)
        } catch (err) {
          return null
        }
      })
      annotations = _.compact(annotations)
      // Update all the codes with the new name of the theme
      annotations = annotations.map(annotation => {
        const classifyingBody = annotation.getBodyForPurpose(Classifying.purpose)
        if (classifyingBody) {
          if (classifyingBody.value.id === theme.id) {
            classifyingBody.value = theme.toObject()
            return annotation
          } else {
            return null
          }
        } else {
          return null
        }
      })
      const promises = annotations.forEach((annotation) => {
        return new Promise((resolve, reject) => {
          window.abwa.annotationServerManager.client.updateAnnotation(annotation.id, annotation, (err, annotation) => {
            if (err) {
              reject(err)
            } else {
              resolve(annotation)
            }
          })
        })
      })
      Promise.all(promises || []).then(() => {})
    })
  }
}

export default UpdateCodebook
