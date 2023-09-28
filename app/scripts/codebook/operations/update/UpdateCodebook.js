import Events from '../../../Events'
import Alerts from '../../../utils/Alerts'
import _ from 'lodash'
import $ from 'jquery'
import Config from '../../../Config'
import Theme from '../../model/Theme'
import Classifying from '../../../annotationManagement/purposes/Classifying'
import Annotation from '../../../annotationManagement/Annotation'
import Dimension from '../../model/Dimension'
import LanguageUtils from '../../../utils/LanguageUtils'
import ImageUtilsOCR from '../../../utils/ImageUtilsOCR'
import ColorUtils from '../../../utils/ColorUtils'

class UpdateCodebook {
  constructor () {
    this.events = {}
  }

  init () {
    // Add event listener for updateCodebook event
    this.initCreateThemeEvent()
    this.initRemoveThemeEvent()
    this.initUpdateThemeEvent()
    this.initMergeThemeEvent()
    this.initCreateDimensionEvent()
    this.initRemoveDimensionEvent()
    this.initUpdateDimensionEvent()
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

  initMergeThemeEvent (callback) {
    this.events.mergeThemeEvent = { element: document, event: Events.mergeTheme, handler: this.mergeThemeEventHandler() }
    this.events.mergeThemeEvent.element.addEventListener(this.events.mergeThemeEvent.event, this.events.mergeThemeEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  initCreateDimensionEvent () {
    this.events.createDimensionEvent = { element: document, event: Events.createDimension, handler: this.createNewDimensionEventHandler() }
    this.events.createDimensionEvent.element.addEventListener(this.events.createDimensionEvent.event, this.events.createDimensionEvent.handler, false)
  }

  initUpdateDimensionEvent () {
    this.events.updateDimensionEvent = { element: document, event: Events.updateDimension, handler: this.createUpdateDimensionEventHandler() }
    this.events.updateDimensionEvent.element.addEventListener(this.events.updateDimensionEvent.event, this.events.updateDimensionEvent.handler, false)
  }

  initRemoveDimensionEvent (callback) {
    this.events.removeDimensionEvent = { element: document, event: Events.removeDimension, handler: this.removeDimensionEventHandler() }
    this.events.removeDimensionEvent.element.addEventListener(this.events.removeDimensionEvent.event, this.events.removeDimensionEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  /**
   * This function adds a button in the sidebar that allows to create new themes.
   */
  static createNewThemeButton (dimension) {
    const dimensionName = dimension.name
    const header = document.createElement('div')
    header.className = 'containerHeaderDimension'
    header.id = 'newThemeButton' + dimensionName
    header.style.backgroundColor = ColorUtils.setAlphaToColor(dimension.color, 0.9)
    header.style.border = '1px solid'
    const headerText = document.createElement('a')
    headerText.innerText = '+ ' + dimensionName
    headerText.style.color = 'black'
    headerText.style.fontSize = '15px'
    header.appendChild(headerText)
    header.addEventListener('click', async () => {
      let newTheme
      const target = window.abwa.annotationManagement.annotationCreator.obtainTargetToCreateAnnotation({})
      let retrievedThemeName = ''
      // Get user selected content
      const selection = document.getSelection()
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
                const childArray = Array.from(selection.anchorNode.childNodes)
                const imgChild = childArray.filter((node) => {
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
        title: 'You are creating a new ' + dimensionName + ' code: ',
        html: '<input autofocus class="formCodeName swal2-input" type="text" id="themeName" placeholder="New ' + Config.tags.grouped.group + ' name" value="' + retrievedThemeName + '"/>',
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
                dimension: dimensionName,
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
    $.contextMenu({
      selector: '#' + 'newThemeButton' + dimensionName,
      items: {
        updateMetaConcept: {
          name: 'Rename meta-concept',
          callback: function () {
            console.log('RENAMING!! ' + dimension.name)
          }
        },
        removeMetaConcept: {
          name: 'Remove meta-concept',
          callback: function () {
            LanguageUtils.dispatchCustomEvent(Events.removeDimension, {
              dimension: dimension
            })
          }
        }
      }
    })
    window.abwa.codebookManager.codebookReader.buttonContainer.append(header)
  }

  /**
   * This function adds a button in the sidebar that allows to create new themes.
   */
  static createNewDimensionButton (dimensionName) {
    const newDimensionButton = document.createElement('button')
    newDimensionButton.innerText = '+ Meta-Concept'
    newDimensionButton.id = 'newDimensionButton'
    newDimensionButton.className = 'tagButton codingElement'
    newDimensionButton.addEventListener('click', async () => {
      if (window.abwa.codebookManager.codebookReader.codebook.dimensions.length < 12) {
        let newDimension
        const target = window.abwa.annotationManagement.annotationCreator.obtainTargetToCreateAnnotation({})
        let retrievedDimensionName = ''
        // Get user selected content
        const selection = document.getSelection()
        // If selection is child of sidebar, return null
        if (selection.anchorNode) {
          if ($(selection.anchorNode).parents('#annotatorSidebarWrapper').toArray().length !== 0 || selection.toString().length < 1) {
            if (selection.anchorNode.innerText) {
              retrievedDimensionName = selection.anchorNode.innerText
            } else {
              if (selection.anchorNode.nodeName === 'IMG') {
                retrievedDimensionName = await ImageUtilsOCR.getStringFromImage(selection.anchorNode)
              } else {
                if (selection.anchorNode.childNodes) {
                  const childArray = Array.from(selection.anchorNode.childNodes)
                  const imgChild = childArray.filter((node) => {
                    return node.nodeName === 'IMG'
                  })
                  if (imgChild[0]) {
                    retrievedDimensionName = await ImageUtilsOCR.getStringFromImage(imgChild[0])
                  }
                }
              }
            }
          } else {
            retrievedDimensionName = selection.toString().trim().replace(/^\w/, c => c.toUpperCase())
          }
        }
        Alerts.multipleInputAlert({
          title: 'You are creating a new theme:',
          html: '<input autofocus class="formCodeName swal2-input" type="text" id="dimensionName" placeholder="New ' + 'theme' + ' name" value="' + retrievedDimensionName + '"/>' +
            '<textarea class="formCodeDescription swal2-textarea" data-minchars="1" data-multiple rows="6" id="dimensionDescription" placeholder="Please type a description that describes this theme' + '..."></textarea>',
          preConfirm: () => {
            const dimensionNameElement = document.querySelector('#dimensionName')
            let dimensionName
            if (_.isElement(dimensionNameElement)) {
              dimensionName = dimensionNameElement.value
            }
            if (dimensionName.length > 0) {
              if (!this.dimensionNameExist(dimensionName)) {
                const dimensionDescriptionElement = document.querySelector('#dimensionDescription')
                let dimensionDescription
                if (_.isElement(dimensionDescriptionElement)) {
                  dimensionDescription = dimensionDescriptionElement.value
                }
                const dimensionColor = ColorUtils.getDimensionColor(window.abwa.codebookManager.codebookReader.codebook.dimensions)
                newDimension = new Dimension({
                  name: dimensionName,
                  description: dimensionDescription,
                  color: dimensionColor,
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
            LanguageUtils.dispatchCustomEvent(Events.createDimension, { dimension: newDimension, target: target })
          },
          cancelCallback: () => {
            console.log('new dimension canceled')
          }
        })
      } else {
        Alerts.errorAlert({
          title: 'No more themes available',
          text: 'Please, delete one of your themes to be able to create a new one'
        })
      }
    })
    window.abwa.codebookManager.codebookReader.buttonContainer.append(newDimensionButton)
  }

  static dimensionNameExist (newDimensionName) {
    const dimensions = window.abwa.codebookManager.codebookReader.codebook.dimensions
    const dimension = _.find(dimensions, (dimension) => {
      return dimension.name === newDimensionName
    })
    if (dimension) {
      return true
    } else {
      return false
    }
  }

  /**
   * This function creates a handler to create a new theme when it receives the createTheme event.
   * @return Event
   */
  createNewDimensionEventHandler () {
    return (event) => {
      const newDimensionAnnotation = event.detail.dimension.toAnnotation()
      window.abwa.annotationServerManager.client.createNewAnnotation(newDimensionAnnotation, (err, annotation) => {
        if (err) {
          Alerts.errorAlert({ text: 'Unable to create the new code. Error: ' + err.toString() })
        } else {
          LanguageUtils.dispatchCustomEvent(Events.dimensionCreated, { newDimensionAnnotation: annotation, target: event.detail.target })
        }
      })
    }
  }

  /**
   * This function creates a handler to update a new theme when it receives the updateTheme event.
   * @return Event
   */
  createUpdateDimensionEventHandler () {
    return (event) => {
      const dimension = event.detail.dimension
      let dimensionToUpdate
      // Show form to update theme
      Alerts.multipleInputAlert({
        title: 'You are updating the theme ' + dimension.name,
        html: '<input autofocus class="formCodeName swal2-input" type="text" id="themeName" type="text" placeholder="New theme name" value="' + dimension.name + '"/>' +
          '<textarea class="formCodeDescription swal2-textarea" data-minchars="1" data-multiple rows="6"  id="themeDescription" placeholder="Please type a description that describes this theme...">' + dimension.description + '</textarea>',
        preConfirm: () => {
          const dimensionNameElement = document.querySelector('#dimensionName')
          let dimensionName
          if (_.isElement(dimensionNameElement)) {
            dimensionName = dimensionNameElement.value
          }
          const dimensionDescriptionElement = document.querySelector('#dimensionDescription')
          let dimensionDescription
          if (_.isElement(dimensionDescriptionElement)) {
            dimensionDescription = dimensionDescriptionElement.value
          }
          dimensionToUpdate = new Dimension({ name: dimensionName, description: dimensionDescription, annotationGuide: window.abwa.codebookManager.codebookReader.codebook })
          dimensionToUpdate.id = dimension.id
        },
        callback: () => {
          // Update codebook
          this.updateCodebookTheme(dimensionToUpdate)
          // Update all annotations done with this theme
          this.updateAnnotationsWithTheme(dimensionToUpdate)
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
  removeDimensionEventHandler () {
    return (event) => {
      const dimension = event.detail.dimension
      // Ask user is sure to remove
      Alerts.confirmAlert({
        title: 'Removing ' + dimension.name,
        text: 'Are you sure that you want to remove the ' + dimension.name + ' category? All dependant concepts will be deleted too. You cannot undo this operation.',
        alertType: Alerts.alertType.warning,
        callback: () => {
          let annotationsToDelete = [dimension.id]
          // Get theme codes id to be removed too
          const themeId = _.map(dimension.themes, (theme) => { return theme.id })
          if (_.every(themeId, _.isString)) {
            annotationsToDelete = annotationsToDelete.concat(themeId)
          }
          // Get linking annotions made with removed theme
          const groupLinkingAnnotations = window.abwa.annotationManagement.annotationReader.groupLinkingAnnotations
          themeId.forEach((conceptId) => {
            const linkingAnnotationToRemove = _.filter(groupLinkingAnnotations, (linkingAnnotation) => {
              const linkingBody = linkingAnnotation.body[0]
              return linkingBody.value.from.id === conceptId || linkingBody.value.to === conceptId
            })
            console.log(linkingAnnotationToRemove)
            const linkingsId = _.map(linkingAnnotationToRemove, (annotation) => { return annotation.id })
            if (_.every(linkingsId, _.isString)) {
              annotationsToDelete = annotationsToDelete.concat(linkingsId)
            }
          })
          window.abwa.annotationServerManager.client.deleteAnnotations(annotationsToDelete, (err, result) => {
            if (err) {
              Alerts.errorAlert({ text: 'Unexpected error when deleting the code.' })
            } else {
              LanguageUtils.dispatchCustomEvent(Events.dimensionRemoved, { dimension: dimension })
            }
          })
        }
      })
    }
  }

  static themeNameExist (newThemeName) {
    const themes = window.abwa.codebookManager.codebookReader.codebook.themes
    const theme = _.find(themes, (theme) => {
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
        title: 'Removing the ' + Config.tags.grouped.group + ' ' + theme.name,
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
          const groupLinkingAnnotations = window.abwa.annotationManagement.annotationReader.groupLinkingAnnotations
          const linkingAnnotationToRemove = _.filter(groupLinkingAnnotations, (linkingAnnotation) => {
            const linkingBody = linkingAnnotation.body[0]
            return linkingBody.value.from.id === theme.id || linkingBody.value.to === theme.id
          })
          console.log(linkingAnnotationToRemove)
          const linkingsId = _.map(linkingAnnotationToRemove, (annotation) => { return annotation.id })
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

  /**
   * This function creates a handler to merge a theme with another one.
   * @return Event
   */
  mergeThemeEventHandler () {
    return (event) => {
      const theme = event.detail.theme
      const concepts = window.abwa.mapContentManager.concepts
      let html = '<span>Please select into which concept do you want to merge the current one</span></br>'
      // Create input
      const mergeConceptSelect = document.createElement('select')
      mergeConceptSelect.id = 'mergeDropdown'
      mergeConceptSelect.placeholder = 'Select a concept'
      concepts.forEach(concept => {
        if (concept.theme.id !== theme.id && !concept.theme.isMisc && !concept.theme.isTopic) {
          const option = document.createElement('option')
          option.value = concept.theme.id
          option.text = concept.theme.name
          mergeConceptSelect.add(option)
        }
      })
      // RENDER
      html += mergeConceptSelect.outerHTML
      const form = {}
      const preConfirmData = {}
      form.preConfirm = () => {
        const mergeConceptId = document.querySelector('#mergeDropdown').value
        if (mergeConceptId) {
          preConfirmData.mergeConcept = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(mergeConceptId)
        }
      }
      form.callback = () => {
        const conceptWhereMerge = preConfirmData.mergeConcept
        Alerts.confirmAlert({
          title: 'Merging',
          text: 'All the annotations from ' + theme.name + ' are going to be included for concept ' + conceptWhereMerge.name + '. Are you sure?',
          callback: () => {
            console.log('TODO: DELETE ' + theme.name + ' and UPDATE ' + conceptWhereMerge.name)
          }
        })
      }
      // Ask user is sure to remove
      Alerts.multipleInputAlert({
        title: 'You are going to merge the ' + Config.tags.grouped.group + ' ' + theme.name + '.',
        html: html,
        showCancelButton: true,
        preConfirm: form.preConfirm,
        callback: form.callback
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
