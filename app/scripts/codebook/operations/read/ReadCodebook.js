import Events from '../../../Events'
import Config from '../../../Config'
import Buttons from './Buttons'
import Alerts from '../../../utils/Alerts'
import $ from 'jquery'
import _ from 'lodash'
import Codebook from '../../model/Codebook'
import Theme from '../../model/Theme'
import LinkingButton from '../../../annotationManagement/purposes/linking/LinkingButton'
import ColorUtils from '../../../utils/ColorUtils'
import LanguageUtils from '../../../utils/LanguageUtils'
import UpdateCodebook from '../update/UpdateCodebook'
import Dimension from '../../model/Dimension'

class ReadCodebook {
  constructor () {
    this.codebook = {}
    this.events = {}
  }

  init (callback) {
    // Add event listener for codebook read event
    this.initCodebookReadEvent()
    this.initCodebookCreatedEvent()
    this.initThemeCreatedEvent()
    this.initThemeUpdatedEvent()
    this.initThemeRemovedEvent()
    this.initDimensionCreatedEvent()
    this.initDimensionUpdatedEvent()
    this.initDimensionRemovedEvent()
    this.initRelationshipsLoadedEvent()
    this.initRelationshipAddedEvent()
    this.initRelationshipDeletedEvent()
    this.loadCodebook(() => {
      // Add event listener for codebook read event
      this.initCodebookCreatedEvent()
      this.initCodebookReadEvent(callback)
    })
  }

  destroy () {
    // Remove event listeners
    const events = _.values(this.events)
    for (let i = 0; i < events.length; i++) {
      events[i].element.removeEventListener(events[i].event, events[i].handler)
    }
    // Remove buttons container
    $('#tagsWrapper').remove()
  }

  // EVENTS

  initRelationshipsLoadedEvent () {
    this.events.relationshipsLoadedEvent = { element: document, event: Events.relationshipsLoaded, handler: this.relationshipsLoadedEventHandler() }
    this.events.relationshipsLoadedEvent.element.addEventListener(this.events.relationshipsLoadedEvent.event, this.events.relationshipsLoadedEvent.handler, false)
  }

  initRelationshipAddedEvent () {
    this.events.relationshipAddedEvent = { element: document, event: Events.relationshipAdded, handler: this.relationshipAddedEventHandler() }
    this.events.relationshipAddedEvent.element.addEventListener(this.events.relationshipAddedEvent.event, this.events.relationshipAddedEvent.handler, false)
  }

  initRelationshipDeletedEvent () {
    this.events.relationshipDeletedEvent = { element: document, event: Events.relationshipDeleted, handler: this.relationshipDeletedEventHandler() }
    this.events.relationshipDeletedEvent.element.addEventListener(this.events.relationshipDeletedEvent.event, this.events.relationshipDeletedEvent.handler, false)
  }

  initThemeCreatedEvent () {
    this.events.themeCreatedEvent = { element: document, event: Events.themeCreated, handler: this.themeCreatedEventHandler() }
    this.events.themeCreatedEvent.element.addEventListener(this.events.themeCreatedEvent.event, this.events.themeCreatedEvent.handler, false)
  }

  initThemeUpdatedEvent () {
    this.events.themeUpdatedEvent = { element: document, event: Events.themeUpdated, handler: this.themeUpdatedEventHandler() }
    this.events.themeUpdatedEvent.element.addEventListener(this.events.themeUpdatedEvent.event, this.events.themeUpdatedEvent.handler, false)
  }

  initThemeRemovedEvent () {
    this.events.themeRemovedEvent = { element: document, event: Events.themeRemoved, handler: this.themeRemovedEventHandler() }
    this.events.themeRemovedEvent.element.addEventListener(this.events.themeRemovedEvent.event, this.events.themeRemovedEvent.handler, false)
  }

  initDimensionCreatedEvent () {
    this.events.dimensionCreatedEvent = { element: document, event: Events.dimensionCreated, handler: this.dimensionCreatedEventHandler() }
    this.events.dimensionCreatedEvent.element.addEventListener(this.events.dimensionCreatedEvent.event, this.events.dimensionCreatedEvent.handler, false)
  }

  initDimensionUpdatedEvent () {
    this.events.dimensionUpdatedEvent = { element: document, event: Events.dimensionUpdated, handler: this.dimensionUpdatedEventHandler() }
    this.events.dimensionUpdatedEvent.element.addEventListener(this.events.dimensionUpdatedEvent.event, this.events.dimensionUpdatedEvent.handler, false)
  }

  initDimensionRemovedEvent () {
    this.events.dimensionRemovedEvent = { element: document, event: Events.dimensionRemoved, handler: this.dimensionRemovedEventHandler() }
    this.events.dimensionRemovedEvent.element.addEventListener(this.events.dimensionRemovedEvent.event, this.events.dimensionRemovedEvent.handler, false)
  }

  initCodebookReadEvent (callback) {
    this.events.codebookReadEvent = { element: document, event: Events.codebookRead, handler: this.codebookReadEventHandler() }
    this.events.codebookReadEvent.element.addEventListener(this.events.codebookReadEvent.event, this.events.codebookReadEvent.handler, false)
    if (_.isFunction(callback)) {
      callback()
    }
  }

  initCodebookCreatedEvent () {
    this.events.codebookCreatedEvent = { element: document, event: Events.codebookCreated, handler: this.codebookCreatedEventHandler() }
    this.events.codebookCreatedEvent.element.addEventListener(this.events.codebookCreatedEvent.event, this.events.codebookCreatedEvent.handler, false)
  }

  /**
   * Loads the codebook inside the sidebar
   * @param callback
   */
  loadCodebook (callback) {
    console.debug('Reading codebook')
    this.initCodebookStructure(() => {
      this.initCodebookContent(callback)
    })
  }

  /**
   * This function add the html associated to the codebook in the sidebar
   * @param callback
   */
  initCodebookStructure (callback) {
    const tagWrapperUrl = chrome.extension.getURL('pages/sidebar/tagWrapper.html')
    $.get(tagWrapperUrl, (html) => {
      $('#abwaSidebarContainer').append($.parseHTML(html))
      this.buttonContainer = document.querySelector('#buttonContainer')
      if (_.isFunction(callback)) {
        callback()
      }
    })
  }

  /**
   * This function loads the content of the codebook in the sidebar
   * @param callback
   */
  initCodebookContent (callback) {
    // Retrieve from annotation server highlighter definition
    this.getCodebookDefinition(null, (err, codebookDefinitionAnnotations) => {
      if (err) {
        Alerts.errorAlert({ text: 'Unable to retrieve annotations from annotation server to initialize highlighter buttons.' }) // TODO i18n
      } else {
        const initCodebookPromise = new Promise((resolve, reject) => {
          if (codebookDefinitionAnnotations.length === 0) {
            const currentGroupFullName = window.abwa.groupSelector.groupFullName || ''
            LanguageUtils.dispatchCustomEvent(Events.createCodebook, { howCreate: 'topicBased', topic: currentGroupFullName })
            resolve()
          } else {
            Codebook.fromAnnotations(codebookDefinitionAnnotations, (err, codebook) => {
              if (err) {
                Alerts.errorAlert({ text: 'Error parsing codebook. Error: ' + err.message })
              } else {
                this.codebook = codebook
                this.renderCodebookInSidebar()
                resolve()
              }
            })
          }
        })
        initCodebookPromise.then(() => {
          if (_.isFunction(callback)) {
            callback()
          }
        })
      }
    })
  }

  /**
   * This function retrieves highlighter definition annotations from annotationServer (e.g.: Hypothes.is)
   * @param callback
   */
  getCodebookDefinition (group, callback) {
    let groupUrl
    if (group) {
      groupUrl = group.links ? group.links.html : group.url
    } else {
      groupUrl = window.abwa.groupSelector.currentGroup.links.html
    }
    window.abwa.annotationServerManager.client.searchAnnotations({
      url: groupUrl,
      order: 'desc'
    }, (err, annotations) => {
      if (err) {
        Alerts.errorAlert({ text: 'Unable to construct the highlighter. Please reload webpage and try it again.' })
      } else {
        // Retrieve tags which has the namespace
        annotations = _.filter(annotations, (annotation) => {
          return this.hasANamespace(annotation, Config.namespace.toString())
        })
        // Remove slr:spreadsheet annotation ONLY for SLR case
        annotations = _.filter(annotations, (annotation) => {
          return !this.hasATag(annotation, 'slr:spreadsheet')
        })
        if (_.isFunction(callback)) {
          callback(null, annotations)
        }
      }
    })
  }

  codebookReadEventHandler () {
    return (event) => {
      // Get the codebook
      this.codebook = event.detail.codebook
      this.renderCodebookInSidebar()
    }
  }

  renderCodebookInSidebar () {
    // Remove buttons from previous codebook if exists
    this.buttonContainer.innerText = ''
    // Set colors for each element
    this.applyColorsToDimensions()
    // Populate sidebar buttons container
    this.createButtons()
  }

  /**
   * This function adds the buttons that must appear in the sidebar to be able to annotate
   */
  createButtons () {
    let themeButtonContainer
    const miscTheme = this.getMiscTheme()
    if (miscTheme) {
      themeButtonContainer = this.createUndefinedHighlightTheme(miscTheme)
      if (_.isElement(themeButtonContainer)) {
        this.buttonContainer.append(themeButtonContainer)
      }
    }
    // Create new theme button
    UpdateCodebook.createNewDimensionButton()
    // Create new relation button
    LinkingButton.createNewLinkButton()
    this.codebook.dimensions.forEach((dimension) => {
      // Create new theme button
      UpdateCodebook.createNewThemeButton(dimension)
      const themes = this.codebook.themes.filter((theme) => {
        return theme.dimension === dimension.name
      })
      themes.sort((a, b) => a.name.localeCompare(b.name))
      for (let i = 0; i < themes.length; i++) {
        const theme = themes[i]
        themeButtonContainer = this.createThemeButtonContainer(theme)
        if (_.isElement(themeButtonContainer)) {
          this.buttonContainer.append(themeButtonContainer)
        }
      }
    })
    const undefindedThemes = this.codebook.themes.filter((theme) => {
      return !theme.dimension
    })
    for (let i = 0; i < undefindedThemes.length; i++) {
      const theme = undefindedThemes[i]
      themeButtonContainer = this.createThemeButtonContainer(theme)
      if (_.isElement(themeButtonContainer)) {
        this.buttonContainer.append(themeButtonContainer)
      }
    }
  }

  createUndefinedHighlightTheme (theme) {
    const name = 'Highlight'
    return Buttons.createButton({
      id: theme.id,
      name: name,
      className: 'codingElement',
      description: theme.description,
      color: theme.color,
      handler: (event) => {
        const themeId = event.target.dataset.codeId
        if (themeId) {
          const theme = this.codebook.getCodeOrThemeFromId(themeId)
          if (LanguageUtils.isInstanceOf(theme, Theme)) {
            const tags = [Config.namespace + ':' + Config.tags.grouped.group + ':' + theme.name]
            // Test if text is selected
            if (document.getSelection().toString().length > 0) {
              // If selected create annotation
              LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
                purpose: 'classifying',
                tags: tags,
                codeId: theme.id
              })
            } else {
              // Else navigate to annotation
              LanguageUtils.dispatchCustomEvent(Events.navigateToAnnotationByCode, {
                codeId: theme.id
              })
            }
          }
        }
      }/*  */,
      buttonRightClickHandler: this.themeRightClickHandler()/*  */
    })
  }

  createThemeButtonContainer (theme) {
    let name
    if (theme.topic !== '') {
      name = theme.topic
    } else {
      name = theme.name
    }
    return Buttons.createButton({
      id: theme.id,
      name: name,
      className: 'codingElement',
      description: theme.description,
      color: theme.color,
      handler: (event) => {
        const themeId = event.target.dataset.codeId
        if (themeId) {
          const theme = this.codebook.getCodeOrThemeFromId(themeId)
          if (LanguageUtils.isInstanceOf(theme, Theme)) {
            const tags = [Config.namespace + ':' + Config.tags.grouped.group + ':' + theme.name]
            // Test if text is selected
            if (document.getSelection().toString().length > 0) {
              // If selected create annotation
              LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
                purpose: 'classifying',
                tags: tags,
                codeId: theme.id
              })
            } else {
              // Else navigate to annotation
              LanguageUtils.dispatchCustomEvent(Events.navigateToAnnotationByCode, {
                codeId: theme.id
              })
            }
          }
        }
      }/*  */,
      buttonRightClickHandler: this.themeRightClickHandler()/*  */
    })
  }

  /**
   * Reloads the button if a new button has been added or deleted
   */
  reloadButtonContainer () {
    this.buttonContainer.innerHTML = ''
    this.createButtons()
  }

  /**
   * Retrieve tags which has the given namespace
   * @param annotation, namespace
   */
  hasANamespace (annotation, namespace) {
    return _.findIndex(annotation.tags, (annotationTag) => {
      return _.startsWith(annotationTag.toLowerCase(), (namespace + ':').toLowerCase())
    }) !== -1
  }

  /**
   * Returns true if the annotation has the given tag
   * @param annotation, tag
   */
  hasATag (annotation, tag) {
    return _.findIndex(annotation.tags, (annotationTag) => {
      return _.startsWith(annotationTag.toLowerCase(), tag.toLowerCase())
    }) !== -1
  }

  /**
   * This function gives a color to each codebook element
   */
  applyColorsToDimensions () {
    if (this.codebook && this.codebook.dimensions) {
      // const listOfColors = ColorUtils.getDifferentColors(this.codebook.dimensions.length + 1)
      const topic = this.getTopicTheme()
      if (topic) {
        const topicColor = ColorUtils.getTopicColor()
        topic.color = ColorUtils.setAlphaToColor(topicColor, 0.6)
      }
      const misc = this.getMiscTheme()
      if (misc) {
        const miscColor = ColorUtils.getMiscColor()
        misc.color = ColorUtils.setAlphaToColor(miscColor, 0.6)
      }
      this.codebook.dimensions.forEach((dimension) => {
        // const color = listOfColors.pop()
        // Set a color for each theme
        const themesPerDimension = this.codebook.themes.filter((theme) => {
          return theme.dimension === dimension.name
        })
        // Set color gradient for each code
        if (themesPerDimension) {
          themesPerDimension.forEach((theme) => {
            theme.color = ColorUtils.setAlphaToColor(dimension.color, 0.5)
          })
        }
      })
    }
  }

  /**
   * This function creates the themes right click context menu.
   */
  themeRightClickHandler () {
    return (themeId) => {
      const items = {}
      const theme = this.codebook.getCodeOrThemeFromId(themeId)
      if (!theme.isTopic) {
        items.updateTheme = { name: 'Rename ' + Config.tags.grouped.group }
        items.removeTheme = { name: 'Remove ' + Config.tags.grouped.group }
        items.manageRelationships = { name: 'Manage links' }
        items.showAnnotations = { name: 'Show annotations' }
      } else {
        items.updateTheme = { name: 'Rename topic' }
        items.manageRelationships = { name: 'Manage links' }
        items.showAnnotations = { name: 'Show annotations' }
      }
      // TODO Implement page annotation and uncomment this:
      // items['pageAnnotation'] = {name: 'Page annotation'}
      return {
        callback: (key) => {
          if (key === 'updateTheme') {
            const theme = this.codebook.getCodeOrThemeFromId(themeId)
            LanguageUtils.dispatchCustomEvent(Events.updateTheme, { theme: theme })
          }
          if (key === 'removeTheme') {
            const theme = this.codebook.getCodeOrThemeFromId(themeId)
            if (LanguageUtils.isInstanceOf(theme, Theme)) {
              LanguageUtils.dispatchCustomEvent(Events.removeTheme, { theme: theme })
            }
          }
          if (key === 'manageRelationships') {
            const theme = this.codebook.getCodeOrThemeFromId(themeId)
            if (LanguageUtils.isInstanceOf(theme, Theme)) {
              window.abwa.mapContentManager.manageRelationships(theme)
            }
          }
          if (key === 'showAnnotations') {
            const theme = this.codebook.getCodeOrThemeFromId(themeId)
            if (LanguageUtils.isInstanceOf(theme, Theme)) {
              window.abwa.annotationServerManager.client.getUserProfile((err, userProfile) => {
                if (err) {
                  console.error('Error while retrieving user profile in hypothesis')
                } else {
                  console.log(userProfile)
                  const groupId = window.abwa.groupSelector.currentGroup.id
                  const groupName = window.abwa.groupSelector.currentGroup.name.toLowerCase().replace(/ /g, '-')
                  const query = '?q=tag:' + Config.namespace + ':' + Config.tags.grouped.group + ':' + theme.name.replace(/ /g, '+')
                  const url = 'https://hypothes.is/groups/' + groupId + '/' + groupName + query
                  console.log(url)
                  window.open(url)
                }
              })
            }
          }
          if (key === 'pageAnnotation') {
            Alerts.infoAlert({ text: 'If sidebar navigation is active, it is not possible to make page level annotations yet.' })
            // TODO Page level annotations, take into account that tags are necessary here (take into account Moodle related case)
            /* let theme = this.codebook.getCodeOrThemeFromId(themeId)
            LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
              purpose: 'classifying',
              theme: theme,
              codeId: theme.id
            }) */
          }
        },
        items: items
      }
    }
  }

  /**
   * This function stores the new theme in the codebook and reloads the button container.
   */
  dimensionCreatedEventHandler () {
    return (event) => {
      const dimension = Dimension.fromAnnotation(event.detail.newDimensionAnnotation, this.codebook)
      // Add to the model the new theme
      this.codebook.addDimension(dimension)
      // Reload button container
      this.reloadButtonContainer()
      // Dispatch codebook updated event
      LanguageUtils.dispatchCustomEvent(Events.codebookUpdated, { codebook: this.codebook })
      // Open the sidebar
      window.abwa.sidebar.openSidebar()
    }
  }

  dimensionUpdatedEventHandler () {
    return (event) => {
      // Update model
      this.codebook.updateTheme(event.detail.updatedTheme)
      // Reload button container
      this.reloadButtonContainer()
      // Dispatch codebook updated event
      LanguageUtils.dispatchCustomEvent(Events.codebookUpdated, { codebook: this.codebook })
      // Open the sidebar
      window.abwa.sidebar.openSidebar()
    }
  }

  /**
   * This function removes the given theme from the codebook and reloads the button container.
   */
  dimensionRemovedEventHandler () {
    return (event) => {
      const dimension = event.detail.dimension
      dimension.annotationGuide.removeDimension(dimension)
      // Reload button container
      this.reloadButtonContainer()
      // Dispatch codebook updated event
      LanguageUtils.dispatchCustomEvent(Events.codebookUpdated, { codebook: this.codebook })
    }
  }

  /**
   * This function stores the new theme in the codebook and reloads the button container.
   */
  themeCreatedEventHandler () {
    return (event) => {
      const theme = Theme.fromAnnotation(event.detail.newThemeAnnotation, this.codebook)
      // Add to the model the new theme
      this.codebook.addTheme(theme)
      // Create theme annotation
      LanguageUtils.dispatchCustomEvent(Events.createAnnotation, {
        purpose: 'classifying',
        target: event.detail.target,
        codeId: theme.id/*  */,
        addToCXL: true /*  */
      })
      // Reload button container
      this.reloadButtonContainer()
      // Dispatch codebook updated event
      LanguageUtils.dispatchCustomEvent(Events.codebookUpdated, { codebook: this.codebook })
      // Open the sidebar
      window.abwa.sidebar.openSidebar()
    }
  }

  themeUpdatedEventHandler () {
    return (event) => {
      // Update model
      this.codebook.updateTheme(event.detail.updatedTheme)
      // Reload button container
      this.reloadButtonContainer()
      // Dispatch codebook updated event
      LanguageUtils.dispatchCustomEvent(Events.codebookUpdated, { codebook: this.codebook })
      // Open the sidebar
      window.abwa.sidebar.openSidebar()
    }
  }

  /**
   * This function removes the given theme from the codebook and reloads the button container.
   */
  themeRemovedEventHandler () {
    return (event) => {
      const theme = event.detail.theme
      theme.annotationGuide.removeTheme(theme)
      // Reload button container
      this.reloadButtonContainer()
      // Dispatch codebook updated event
      LanguageUtils.dispatchCustomEvent(Events.codebookUpdated, { codebook: this.codebook })
    }
  }

  /**
   * Creates event handler for event CodebookCreated
   * @returns {function(...[*]=)}
   */
  codebookCreatedEventHandler () {
    return () => {
      this.buttonContainer.innerHTML = ''
      this.initCodebookContent()
    }
  }

  relationshipsLoadedEventHandler () {
    return () => {
      const relations = window.abwa.mapContentManager.relationships
      for (let i = 0; i < relations.length; i++) {
        const relation = relations[i]
        // Get button
        if (relation.fromConcept) {
          const themeButton = document.querySelectorAll('.tagButton[data-code-id="' + relation.fromConcept.id + '"]')
          // Add relation to tooltip
          if (themeButton.length > 0) {
            if (themeButton[0].title.includes('Relationships:')) {
              themeButton[0].title += '\n' + relation.linkingWord + ' ' + relation.toConcept.name
            } else {
              themeButton[0].title += '\nRelationships:\n' + relation.linkingWord + ' ' + relation.toConcept.name
            }
          }
        }
      }
    }
  }

  relationshipAddedEventHandler () {
    return (event) => {
      const relation = event.detail.relation
      const themeButton = document.querySelectorAll('.tagButton[data-code-id="' + relation.fromConcept.id + '"]')
      // Add relation to tooltip
      if (themeButton[0].title.includes('Relationships:')) {
        themeButton[0].title += '\n' + relation.linkingWord + ' ' + relation.toConcept.name
      } else {
        themeButton[0].title += '\nRelationships:\n' + relation.linkingWord + ' ' + relation.toConcept.name
      }
    }
  }

  relationshipDeletedEventHandler () {
    return (event) => {
      const relation = event.detail.relation
      const themeButton = document.querySelectorAll('.tagButton[data-code-id="' + relation.fromConcept.id + '"]')
      // Add relation to tooltip
      if (themeButton[0].title.includes('Relationships:')) {
        themeButton[0].title = themeButton[0].title.replace('\n' + relation.linkingWord + ' ' + relation.toConcept.name, '')
      }
      if (((themeButton[0].title.match(/\n/g)) || []).length === 1) {
        themeButton[0].title = themeButton[0].title.replace('\nRelationships:', '')
      }
    }
  }

  getTopicTheme () {
    const themes = this.codebook.themes
    return _.find(themes, (theme) => { return theme.isTopic === true })
  }

  getMiscTheme () {
    const themes = this.codebook.themes
    return _.find(themes, (theme) => { return theme.isMisc === true })
  }
}

export default ReadCodebook
