import jsYaml from 'js-yaml'
import Theme from './Theme'
import Config from '../../Config'
import _ from 'lodash'
import LanguageUtils from '../../utils/LanguageUtils'
import Hypothesis from '../../annotationServer/hypothesis/Hypothesis'
import ColorUtils from '../../utils/ColorUtils'

class Codebook {
  constructor ({
    id = null,
    name = '',
    annotationServer = null/*  *//*  */
  }) {
    this.id = id
    this.name = name
    this.themes = []
    this.annotationServer = annotationServer
  }

  toAnnotation () {
    const motivationTag = 'motivation:defining'
    const guideTag = Config.namespace + ':guide'
    const tags = [motivationTag, guideTag]
    // Construct text attribute of the annotation
    let textObject
    // Return the constructed annotation
    return {
      name: this.name,
      group: this.annotationServer.getGroupId(),
      permissions: {
        read: ['group:' + this.annotationServer.getGroupId()]
      },
      references: [],
      motivation: 'defining',
      tags: tags,
      target: [],
      text: jsYaml.dump(textObject),
      uri: this.annotationServer.getGroupUrl()
    }
  }

  toAnnotations () {
    let annotations = []
    // Create annotation for current element
    annotations.push(this.toAnnotation())
    // Create annotations for all criterias
    for (let i = 0; i < this.themes.length; i++) {
      annotations = annotations.concat(this.themes[i].toAnnotations())
    }
    return annotations
  }

  static fromAnnotation (annotation, callback) {
    this.setAnnotationServer(null, (annotationServer) => {
      const annotationGuideOpts = { id: annotation.id, name: annotation.name, annotationServer: annotationServer }
      let guide
      guide = new Codebook(annotationGuideOpts)
      if (_.isFunction(callback)) {
        callback(guide)
      }
    })
  }

  static fromAnnotations (annotations, callback) {
    // return Codebook
    const guideAnnotation = _.remove(annotations, (annotation) => {
      return _.some(annotation.tags, (tag) => { return tag === Config.namespace + ':guide' })
    })
    if (guideAnnotation.length > 0) {
      Codebook.fromAnnotation(guideAnnotation[0], (guide) => {
        // TODO Complete the guide from the annotations
        // For the rest of annotations, get themes and codes
        const themeAnnotations = _.remove(annotations, (annotation) => {
          return _.some(annotation.tags, (tag) => {
            return tag.includes(Config.namespace + ':' + Config.tags.grouped.group + ':')
          })
        })
        for (let i = 0; i < themeAnnotations.length; i++) {
          const theme = Theme.fromAnnotation(themeAnnotations[i], guide)
          if (LanguageUtils.isInstanceOf(theme, Theme)) {
            guide.themes.push(theme)
          }
        }
        if (_.isFunction(callback)) {
          callback(null, guide)
        }
      })
    } else {
      callback(new Error('No annotations for codebook defined'))
    }
  }

  static setAnnotationServer (newGroupId, callback) {
    let annotationServerInstance
    let group
    if (_.has(window.abwa, 'groupSelector')) {
      if (newGroupId === null) {
        group = window.abwa.groupSelector.currentGroup
      } else {
        group = window.abwa.groupSelector.groups.find((element) => {
          return element.id === newGroupId
        })
      }
    } else {
      group = { id: newGroupId } // Faking group object only with ID property, currently this is the only property used, but in case in any future feature is required to be used with more, this line must be taken into account for further modification
    }
    annotationServerInstance = new Hypothesis({ group: group })
    if (_.isFunction(callback)) {
      callback(annotationServerInstance)
    }
  }

  static fromObjects (userDefinedHighlighterDefinition) {
    const annotationGuide = new Codebook({ name: userDefinedHighlighterDefinition.name })
    for (let i = 0; i < userDefinedHighlighterDefinition.definition.length; i++) {
      const themeDefinition = userDefinedHighlighterDefinition.definition[i]
      const theme = new Theme({ name: themeDefinition.name, description: themeDefinition.description, annotationGuide })
      annotationGuide.themes.push(theme)
    }
    return annotationGuide
  }

  static fromTopic (topicName) {
    let annotationGuide = new Codebook({ name: topicName + 'concept map' })
    let theme = new Theme({ name: topicName, description: 'Topic of the concept map', isTopic: true, annotationGuide })
    annotationGuide.themes.push(theme)
    return annotationGuide
  }

  static fromCXLFile (conceptList, name) {
    let annotationGuide = new Codebook({ name: name })
    for (let i = 0; i < conceptList.childNodes.length; i++) {
      let concept = conceptList.childNodes[i]
      let conceptName = concept.getAttribute('label')
      let conceptID = concept.getAttribute('id')
      let theme = new Theme({ id: conceptID, name: conceptName, annotationGuide })
      annotationGuide.themes.push(theme)
    }
    return annotationGuide
  }

  getCodeOrThemeFromId (id) {
    let themeOrCodeToReturn = null
    const theme = _.find(this.themes, (theme) => {
      return theme.id === id
    })
    if (LanguageUtils.isInstanceOf(theme, Theme)) {
      themeOrCodeToReturn = theme
    } /*  */
    return themeOrCodeToReturn
  }

  addTheme (theme) {
    if (LanguageUtils.isInstanceOf(theme, Theme)) {
      this.themes.push(theme)
      // Get new color for the theme
      const colors = ColorUtils.getDifferentColors(this.themes.length)
      const lastColor = colors.pop()
      theme.color = ColorUtils.setAlphaToColor(lastColor, Config.colors.minAlpha)
    }
  }

  updateTheme (theme, previousId) {
    if (LanguageUtils.isInstanceOf(theme, Theme)) {
      // Find item index using _.findIndex
      const index = _.findIndex(this.themes, (it) => {
        return it.id === theme.id || it.id === previousId
      })
      const previousTheme = this.themes[index]
      // Replace item at index using native splice
      this.themes.splice(index, 1, theme)
      theme.color = previousTheme.color
    }
  }

  removeTheme (theme) {
    _.remove(this.themes, theme)
  }

  toObjects (name) {
    const object = {
      name: name,
      definition: []
    }
    // For each criteria create the object
    for (let i = 0; i < this.themes.length; i++) {
      const theme = this.themes[i]
      if (LanguageUtils.isInstanceOf(theme, Theme)) {
        object.definition.push(theme.toObjects())
      }
    }
    return object
  }

  getThemeByName (name) {
    if (_.isString(name)) {
      return this.themes.find(theme => theme.name === name)
    } else {
      return null
    }
  }

  static codebookAnnotationsAreEqual (anno1, anno2) {
    return anno1.group === anno2.group &&
      anno1.motivation === anno2.motivation &&
      _.isEmpty(_.difference(anno1.tags, anno2.tags)) &&
      anno1.text === anno2.text &&
      anno1.uri === anno2.uri
  }
}

export default Codebook
