// const _ = require('lodash')
import $ from 'jquery'
import Alerts from '../../../utils/Alerts'
import LanguageUtils from '../../../utils/LanguageUtils'
import Events from '../../../Events'
const swal = null

class LinkingForm {
  /**
   *
   * @param annotation annotation that is involved
   * @param formCallback callback to execute after form is closed
   * @param addingHtml
   * @returns {Promise<unknown>}
   */
  static showLinkingForm (previousRelationshipData) {
    return new Promise(() => {
      // Close sidebar if opened
      window.abwa.sidebar.closeSidebar()
      const title = 'You are creating a new relation'
      // Get body for classifying
      const showForm = () => {
        // Create form
        const html = LinkingForm.generateLinkingFormHTML()
        const form = LinkingForm.generateLinkingForm(previousRelationshipData)
        Alerts.threeOptionsAlert({
          title: title || '',
          html: html,
          onBeforeOpen: form.onBeforeOpen,
          // position: Alerts.position.bottom, // TODO Must be check if it is better to show in bottom or not
          confirmButtonText: 'Save relation',
          denyButtonText: 'Save & Create another',
          callback: form.callback,
          denyCallback: form.denyCallback,
          cancelCallback: form.cancelCallback,
          customClass: 'large-swal',
          preConfirm: form.preConfirm,
          preDeny: form.preDeny
        })
      }
      showForm()
    })
  }

  static generateLinkingForm (previousRelationshipData) {
    // On before open
    let onBeforeOpen
    onBeforeOpen = () => {
      if (!previousRelationshipData) {
        let retrievedLW
        // Get user selected content
        const selection = document.getSelection()
        // If selection is child of sidebar, return null
        if ($(selection.anchorNode).parents('#annotatorSidebarWrapper').toArray().length !== 0 || selection.toString().length < 1) {
          retrievedLW = ''
        } else {
          retrievedLW = selection.toString().trim()
        }
        onBeforeOpen.target = window.abwa.annotationManagement.annotationCreator.obtainTargetToCreateAnnotation({})
        document.querySelector('#inputLinkingWord').value = retrievedLW
      } else {
        onBeforeOpen.target = previousRelationshipData.target
        document.querySelector('#inputLinkingWord').value = previousRelationshipData.linkingWord
        document.querySelector('#categorizeDropdownFrom').value = previousRelationshipData.from
        document.querySelector('#categorizeDropdownTo').value = previousRelationshipData.to
      }
    }
    // Preconfirm
    const preConfirmData = {}
    const preConfirm = () => {
      const from = document.querySelector('#categorizeDropdownFrom').value
      preConfirmData.linkingWord = document.querySelector('#inputLinkingWord').value
      const to = document.querySelector('#categorizeDropdownTo').value
      preConfirmData.fromTheme = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(from)
      preConfirmData.toTheme = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(to)
      if (from === to || preConfirmData.linkingWord === '') {
        const swal = require('sweetalert2')
        if (from === to) {
          swal.showValidationMessage('You have to make the relation between two different concepts.')
        } else {
          swal.showValidationMessage('You have to provide a linking word.')
        }
      }
    }
    // Predeny
    const preDenyData = {}
    const preDeny = () => {
      const from = document.querySelector('#categorizeDropdownFrom').value
      preDenyData.linkingWord = document.querySelector('#inputLinkingWord').value
      const to = document.querySelector('#categorizeDropdownTo').value
      preDenyData.fromTheme = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(from)
      preDenyData.toTheme = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(to)
      if (from === to || preConfirmData.linkingWord === '') {
        const swal = require('sweetalert2')
        if (from === to) {
          swal.showValidationMessage('You have to make the relation between two different concepts.')
        } else {
          swal.showValidationMessage('You have to provide a linking word.')
        }
        return false
      }
    }
    // Callback
    const callback = () => {
      // TODO comprobar que no existe
      const tags = ['from' + ':' + preConfirmData.fromTheme.name]
      tags.push('linkingWord:' + preConfirmData.linkingWord)
      tags.push('to:' + preConfirmData.toTheme.name)
      LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
        purpose: 'linking',
        tags: tags,
        from: preConfirmData.fromTheme.id,
        to: preConfirmData.toTheme.id,
        linkingWord: preConfirmData.linkingWord,
        target: onBeforeOpen.target
      })
      Alerts.simpleSuccessAlert({ text: 'Saved' })
    }
    const denyCallback = () => {
      const tags = ['from' + ':' + preDenyData.fromTheme.name]
      tags.push('linkingWord:' + preDenyData.linkingWord)
      tags.push('to:' + preDenyData.toTheme.name)
      LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
        purpose: 'linking',
        tags: tags,
        from: preDenyData.fromTheme.id,
        to: preDenyData.toTheme.id,
        linkingWord: preDenyData.linkingWord,
        target: onBeforeOpen.target
      })
      const returnToLinkingForm = () => {
        LinkingForm.showLinkingForm(relationshipData)
      }
      const relationshipData = {}
      relationshipData.target = onBeforeOpen.target
      relationshipData.from = preDenyData.fromTheme.id
      relationshipData.to = preDenyData.toTheme.id
      relationshipData.linkingWord = preDenyData.linkingWord
      Alerts.simpleSuccessAlert({ text: 'Saved', callback: returnToLinkingForm })
    }
    const cancelCallback = () => {
      console.log('new link canceled')
    }
    return { onBeforeOpen: onBeforeOpen, preConfirm: preConfirm, preDeny: preDeny, callback: callback, denyCallback: denyCallback, cancelCallback: cancelCallback }
  }

  static generateLinkingFormHTML () {
    let html = ''

    // Create row
    const divRow = document.createElement('div')
    divRow.id = 'divFirstRow'
    divRow.id = 'divRow'

    /** FROM **/
    // Create div
    const divFrom = document.createElement('div')
    divFrom.id = 'divFrom'
    divFrom.className = 'rowElement'

    // Create span
    const fromSpan = document.createElement('span')
    fromSpan.className = 'linkingFormLabel'
    fromSpan.textContent = 'From: '

    // Create input
    const inputFrom = document.createElement('select')
    inputFrom.id = 'categorizeDropdownFrom'
    inputFrom.className = 'linkingConceptInput'
    inputFrom.placeholder = 'Select a concept'
    inputFrom.setAttribute('list', 'fromConcepts')

    // let fromConcepts = document.createElement('datalist')
    // fromConcepts.id = 'fromConcepts'

    divFrom.appendChild(fromSpan)
    divFrom.appendChild(inputFrom)

    /** LINKING WORD **/
    // Create div
    const divLinkingWord = document.createElement('div')
    divLinkingWord.id = 'divLinkingWord'
    divLinkingWord.className = 'rowElement'

    // Create span
    const linkingWordSpan = document.createElement('span')
    linkingWordSpan.className = 'linkingFormLabel'
    linkingWordSpan.textContent = ' Linking word: '

    // Create input
    const inputLinkingWord = document.createElement('input')
    inputLinkingWord.id = 'inputLinkingWord'

    divLinkingWord.appendChild(linkingWordSpan)
    divLinkingWord.appendChild(inputLinkingWord)

    /** TO **/
    // Create Div
    const divTo = document.createElement('div')
    divTo.id = 'divTo'
    divTo.className = 'rowElement'

    // Create span
    const toSpan = document.createElement('span')
    toSpan.className = 'linkingFormLabel'
    toSpan.textContent = ' To: '

    // Create input
    const inputTo = document.createElement('select')
    inputTo.id = 'categorizeDropdownTo'
    inputTo.className = 'linkingConceptInput'
    inputTo.placeholder = 'Select a concept'
    // inputTo.setAttribute('list', 'toConcepts')

    // let toConcepts = document.createElement('datalist')
    // toConcepts.id = 'toConcepts'

    divTo.appendChild(toSpan)
    divTo.appendChild(inputTo)

    const themes = window.abwa.codebookManager.codebookReader.codebook.themes
    const flipThemes = themes.reverse()
    flipThemes.forEach(theme => {
      if (!theme.isMisc) {
        const fromOption = document.createElement('option')
        fromOption.value = theme.id
        fromOption.text = theme.name
        inputFrom.add(fromOption)
        if (!theme.isTopic) {
          const toOption = document.createElement('option')
          toOption.value = theme.id
          toOption.text = theme.name
          inputTo.add(toOption)
        }
      }
    })

    divRow.appendChild(divFrom)
    divRow.appendChild(divLinkingWord)
    divRow.appendChild(divTo)

    // RENDER
    html += divRow.outerHTML

    return html
  }
}

export default LinkingForm
