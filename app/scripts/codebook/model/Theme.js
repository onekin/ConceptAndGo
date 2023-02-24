import jsYaml from 'js-yaml'
import _ from 'lodash'
import Config from '../../Config'
import ColorUtils from '../../utils/ColorUtils'
import LanguageUtils from '../../utils/LanguageUtils'

class Theme {
  constructor ({
    id,
    name,
    dimension,
    color,
    annotationGuide,
    createdDate = new Date(),
    description = ''/*  *//*  *//*  */,
    isTopic = false/*  */ /*  */,
    topic = '' /*  */,
    isMisc = false
  }) {
    this.id = id
    this.name = name
    this.dimension = dimension
    this.description = description
    this.color = color
    this.annotationGuide = annotationGuide
    if (LanguageUtils.isInstanceOf(createdDate, Date)) {
      this.createdDate = createdDate
    } else {
      const timestamp = Date.parse(createdDate)
      if (_.isNumber(timestamp)) {
        this.createdDate = new Date(createdDate)
      }
    }
    this.isTopic = isTopic
    this.isMisc = isMisc
    this.topic = topic
  }

  toAnnotations () {
    let annotations = []
    // Create its annotations
    annotations.push(this.toAnnotation())
    return annotations
  }

  toAnnotation () {
    const themeTag = Config.namespace + ':' + Config.tags.grouped.group + ':' + this.name
    const assignedDimensionTag = Config.namespace + ':assignedDimension' + ':' + this.dimension
    const motivationTag = Config.namespace + ':' + Config.tags.motivation + ':' + 'codebookDevelopment'
    const tags = [themeTag, assignedDimensionTag, motivationTag]
    return {
      id: this.id,
      group: this.annotationGuide.annotationServer.group.id,
      permissions: {
        read: ['group:' + this.annotationGuide.annotationServer.getGroupId()]
      },
      motivation: 'codebookDevelopment',
      references: [],
      tags: tags,
      target: [],
      text: jsYaml.dump({
        id: this.id || ''/*  */,
        description: this.description/*  *//*  */,
        isTopic: this.isTopic,
        topic: this.topic,
        isMisc: this.isMisc
      }),
      uri: this.annotationGuide.annotationServer.getGroupUrl()
    }
  }

  static fromAnnotation (annotation, annotationGuide = {}) {
    const themeTag = _.find(annotation.tags, (tag) => {
      return tag.includes(Config.namespace + ':' + Config.tags.grouped.group + ':')
    })
    const dimensionTag = _.find(annotation.tags, (tag) => {
      return tag.includes(Config.namespace + ':assignedDimension' + ':')
    })
    if (_.isString(themeTag)) {
      let dimension
      if (dimensionTag) {
        dimension = dimensionTag.replace(Config.namespace + ':assignedDimension' + ':', '')
      } else {
        dimension = ''
      }
      const name = themeTag.replace(Config.namespace + ':' + Config.tags.grouped.group + ':', '')
      const config = jsYaml.load(annotation.text)
      if (_.isObject(config)) {
        const description = config.description
        const id = annotation.id
        let isTopic = config.isTopic
        let topic = config.topic
        let isMisc = config.isMisc
        return new Theme({
          id,
          name,
          dimension,
          description,
          createdDate: annotation.updated,
          annotationGuide/*  *//*  *//*  */,
          isTopic,
          topic,
          isMisc
        })
      } else {
        console.error('Unable to retrieve configuration for annotation')
      }
    } else {
      console.error('Unable to retrieve criteria from annotation')
    }
  }

  reloadColorsForCodes () {
    this.codes.forEach((code, j) => {
      const alphaForChild = (Config.colors.maxAlpha - Config.colors.minAlpha) / this.codes.length * (j + 1) + Config.colors.minAlpha
      code.color = ColorUtils.setAlphaToColor(this.color, alphaForChild)
    })
  }


  toObject () {
    return {
      name: this.name,
      description: this.description,
      id: this.id/*  */,
      isTopic: this.isTopic/*  */ /*  */,
      topic: this.topic,
      isMisc: this.isMisc
    }
  }

  getTags () {
    return [Config.namespace + ':' + Config.tags.grouped.group + ':' + this.name]
  }


  maxCode () {
    try {
      if (_.every(this.codes.map(code => _.isNumber(parseFloat(code.name))))) { // All elements are numbers
        return _.maxBy(this.codes, (code) => { return parseFloat(code.name) })
      } else {
        return null
      }
    } catch (e) {
      return null
    }
  }
}

export default Theme
