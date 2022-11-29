import jsYaml from 'js-yaml'
import _ from 'lodash'
import Config from '../../Config'
import ColorUtils from '../../utils/ColorUtils'
import LanguageUtils from '../../utils/LanguageUtils'

class Theme {
  constructor ({
    id,
    name,
    color,
    annotationGuide,
    createdDate = new Date(),
    description = ''/*  *//*  *//*  */,
    isTopic = false/*  */
  }) {
    this.id = id
    this.name = name
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
  }

  toAnnotations () {
    let annotations = []
    // Create its annotations
    annotations.push(this.toAnnotation())
    return annotations
  }

  toAnnotation () {
    const themeTag = Config.namespace + ':' + Config.tags.grouped.group + ':' + this.name
    const motivationTag = Config.namespace + ':' + Config.tags.motivation + ':' + 'codebookDevelopment'
    const tags = [themeTag, motivationTag]
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
        isTopic: this.isTopic/*  */
      }),
      uri: this.annotationGuide.annotationServer.getGroupUrl()
    }
  }

  static fromAnnotation (annotation, annotationGuide = {}) {
    const themeTag = _.find(annotation.tags, (tag) => {
      return tag.includes(Config.namespace + ':' + Config.tags.grouped.group + ':')
    })
    if (_.isString(themeTag)) {
      const name = themeTag.replace(Config.namespace + ':' + Config.tags.grouped.group + ':', '')
      const config = jsYaml.load(annotation.text)
      if (_.isObject(config)) {
        const description = config.description
        const id = annotation.id
        let isTopic = config.isTopic
        return new Theme({
          id,
          name,
          description,
          createdDate: annotation.updated,
          annotationGuide/*  *//*  *//*  */,
          isTopic/*  */
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
      isTopic: this.isTopic/*  */
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
