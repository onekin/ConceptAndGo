import _ from 'lodash'
import LanguageUtils from '../utils/LanguageUtils'
import Classifying from './purposes/Classifying'
import Linking from './purposes/linking/Linking'
import HypothesisClientManager from '../annotationServer/hypothesis/HypothesisClientManager'

class Annotation {
  constructor ({
    id,
    body = [],
    references = [],
    group = window.abwa.groupSelector.currentGroup.id,
    permissions = {
      read: ['group:' + window.abwa.groupSelector.currentGroup.id]
    },
    target,
    tags = [],
    creator = window.abwa.groupSelector.getCreatorData() || window.abwa.groupSelector.user.userid,
    created,
    modified
  }) {
    if (!_.isArray(target) || _.isEmpty(target[0])) {
      throw new Error('Annotation must have a non-empty target')
    }
    this.target = target
    this.id = id
    this.body = body
    this.references = references
    this.permissions = permissions
    this.tags = _.uniq(tags)
    this.creator = creator
    this.group = group
    const createdDate = Date.parse(created)
    if (_.isNumber(createdDate)) {
      this.created = new Date(created)
    }
    const modifiedDate = Date.parse(modified)
    if (_.isNumber(modifiedDate)) {
      this.modified = new Date(modified)
    }
  }

  getBodyForPurpose (purpose) {
    if (_.isString(purpose) && _.isArray(this.body)) {
      return this.body.find((body) => {
        if (body && body.purpose) {
          return body.purpose === purpose
        } else {
          return null
        }
      })
    }
  }

  serialize () {
    const data = {
      '@context': 'http://www.w3.org/ns/anno.jsonld',
      group: this.group || window.abwa.groupSelector.currentGroup.id,
      creator: this.creator || window.abwa.groupSelector.getCreatorData() || window.abwa.groupSelector.user.userid,
      document: {},
      body: this.body,
      permissions: this.permissions || {
        read: ['group:' + window.abwa.groupSelector.currentGroup.id]
      },
      references: this.references || [],
      tags: this.tags,
      target: this.target,
      text: '',
      uri: /*  */ this.target[0].source.url || this.target[0].source.urn
    }
    // The following lines are added to maintain compatibility with hypothes.is's data model that doesn't follow the W3C in all their attributes
    // Adaptation of target source to hypothes.is's compatible document attribute
    if (LanguageUtils.isInstanceOf(window.abwa.annotationServerManager, HypothesisClientManager)) {
      // Add uri attribute
      data.uri = data.uri || window.abwa.targetManager.getDocumentURIToSaveInAnnotationServer()
      // Add document, uris, title, etc.
      const uris = window.abwa.targetManager.getDocumentURIs()
      data.document = {}
      if (uris.urn) {
        data.document.documentFingerprint = uris.urn
      }
      data.document.link = Object.values(uris).map(uri => { return { href: uri } })
      if (uris.doi) {
        data.document.dc = { identifier: [uris.doi] }
        data.document.highwire = { doi: [uris.doi] }
      }
      // If document title is retrieved
      if (_.isString(window.abwa.targetManager.documentTitle)) {
        data.document.title = window.abwa.targetManager.documentTitle
      }
      // Copy to metadata field because hypothes.is doesn't return from its API all the data that it is placed in document
      data.documentMetadata = this.target
    }
    return data
  }

  static deserialize (annotationObject) {
    const annotation = new Annotation({
      id: annotationObject.id,
      group: annotationObject.group,
      creator: annotationObject.creator,
      permissions: annotationObject.permissions,
      references: annotationObject.references,
      tags: annotationObject.tags,
      target: annotationObject.target,
      created: annotationObject.created,
      modified: annotationObject.updated,
      evidence: annotationObject.links
    })
    if (_.isArray(annotation.body) && annotationObject.body) {
      annotation.body = annotationObject.body.map((body) => {
        if (body.purpose === Classifying.purpose) {
          // To remove the purpose from the annotation body
          const tempBody = JSON.parse(JSON.stringify(body))
          delete tempBody.purpose
          // Create new element of type Classifying
          return new Classifying({ code: tempBody.value })
        }
        if (body.purpose === Linking.purpose) {
          // To remove the purpose from the annotation body
          let tempBody = JSON.parse(JSON.stringify(body))
          delete tempBody.purpose
          // Create new element of type Linking
          return new Linking({ value: tempBody.value })
        }
        return null
      })
    }
    if (LanguageUtils.isInstanceOf(window.abwa.annotationServerManager, HypothesisClientManager)) {
      annotation.target = annotationObject.documentMetadata || annotationObject.target
    }
    return annotation
  }
}

export default Annotation
