import jsYaml from 'js-yaml'
import Theme from './Theme'
import Config from '../../Config'
import _ from 'lodash'
import LanguageUtils from '../../utils/LanguageUtils'
import Dimension from './Dimension'
import CXLImporter from '../../importExport/cmap/CXLImporter'
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
    this.dimensions = []
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
    if (this.themes) {
      for (let i = 0; i < this.themes.length; i++) {
        annotations = annotations.concat(this.themes[i].toAnnotations())
      }
    }
    if (this.dimensions) {
      for (let i = 0; i < this.dimensions.length; i++) {
        annotations = annotations.concat(this.dimensions[i].toAnnotation())
      }
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
        const dimensionsAnnotations = _.remove(annotations, (annotation) => {
          return _.some(annotation.tags, (tag) => {
            return tag.includes(Config.namespace + ':' + 'dimension:')
          })
        })
        for (let i = 0; i < themeAnnotations.length; i++) {
          const theme = Theme.fromAnnotation(themeAnnotations[i], guide)
          if (LanguageUtils.isInstanceOf(theme, Theme)) {
            guide.themes.push(theme)
          }
        }
        for (let i = 0; i < dimensionsAnnotations.length; i++) {
          const dimension = Dimension.fromAnnotation(dimensionsAnnotations[i], guide)
          const themes = guide.themes.filter((theme) => {
            return theme.dimension === dimension.name
          })
          if (themes) {
            for (let i = 0; i < themes.length; i++) {
              dimension.addTheme(themes[i])
            }
          }
          if (LanguageUtils.isInstanceOf(dimension, Dimension)) {
            guide.dimensions.push(dimension)
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
    const annotationGuide = new Codebook({ name: topicName + 'concept map' })
    const theme = new Theme({ name: topicName, description: 'Topic of the concept map', isTopic: true, annotationGuide })
    annotationGuide.themes.push(theme)
    return annotationGuide
  }

  static fromCXLFile (conceptList, dimensionsList, name, topic, conceptAppearanceList) {
    const annotationGuide = new Codebook({ name: name })
    if (dimensionsList.length > 0) {
      for (let i = 0; i < dimensionsList.length; i++) {
        const dimension = new Dimension({ name: dimensionsList[i], annotationGuide })
        const color = ColorUtils.getDimensionColor(annotationGuide.dimensions)
        dimension.color = ColorUtils.setAlphaToColor(color, 0.6)
        annotationGuide.dimensions.push(dimension)
      }
    }
    if (conceptList && conceptList.children) {
      conceptList = Array.from(conceptList.children)
    }
    if (conceptList && conceptList.length > 0) {
      for (let i = 0; i < conceptList.length; i++) {
        const concept = conceptList[i]
        const conceptName = concept.getAttribute('label')
        const conceptID = concept.getAttribute('id')
        if (conceptAppearanceList.children) {
          conceptAppearanceList = Array.from(conceptAppearanceList.children)
        }
        if (!CXLImporter.isDimension(conceptAppearanceList, conceptID)) {
          const theme = new Theme({ id: conceptID, name: conceptName, annotationGuide })
          annotationGuide.themes.push(theme)
        }
      }
    } else {
      const theme = new Theme({ name: name, annotationGuide, topic })
      annotationGuide.themes.push(theme)
      const miscTheme = new Theme({ name: 'misc', annotationGuide, isMisc: true })
      annotationGuide.themes.push(miscTheme)
    }

    return annotationGuide
  }

  getDimensionsForCmapCloud () {
    let dimensionsString = ''
    this.dimensions.forEach(dimension => {
      dimensionsString = dimensionsString + dimension.name + ';'
    })
    dimensionsString = dimensionsString.slice(0, -1)
    return dimensionsString
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
      const dimension = this.getDimensionByName(theme.dimension)
      theme.color = dimension.color
      dimension.addTheme(theme)
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

  addDimension (dimension) {
    if (LanguageUtils.isInstanceOf(dimension, Dimension)) {
      dimension.color = ColorUtils.setAlphaToColor(dimension.color, 0.6)
      this.dimensions.push(dimension)
    }
  }

  updateDimension (theme, previousId) {
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

  removeDimension (dimension) {
    const themesToRemove = dimension.themes
    if (themesToRemove) {
      themesToRemove.forEach((theme) => {
        this.removeTheme(theme)
      })
    }
    _.remove(this.dimensions, dimension)
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

  getDimensionByName (name) {
    if (_.isString(name)) {
      return this.dimensions.find(dimension => dimension.name === name)
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
