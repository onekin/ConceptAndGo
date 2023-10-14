import ExportCXLArchiveFile from './ExportCXLArchiveFile'
import ExportCmapCloud from './cmapCloud/ExportCmapCloud'
import ToolURL from './evidenceAnnotation/ToolURL'
import LanguageUtils from '../../utils/LanguageUtils'
import _ from 'lodash'
import ColorUtils from '../../utils/ColorUtils'
import Config from '../../Config'

export class LinkingPhrase {
  constructor (linkingWord, id) {
    // code
    this.linkingWord = linkingWord
    this.id = id
    this.fromConcepts = []
    this.toConcepts = []
    this.evidenceAnnotations = []
  }
}

export class CXLExporter {
  static exportCXLFile (exportType, userData, mappingAnnotation) {
    // Get annotations from tag manager and content annotator
    const concepts = window.abwa.mapContentManager.concepts
    const relationships = window.abwa.mapContentManager.relationships
    // Prepare linking phrases for doing conections
    const linkingPhrases = []
    // linkingPhrases = this.mergeLinkingPhrases(linkingPhrases, relationships)
    for (let i = 0; i < relationships.length; i++) {
      const relation = relationships[i]
      const linkingPhraseToAdd = new LinkingPhrase(relation.linkingWord, relation.id)
      if (relation.fromConcept && relation.toConcept) {
        linkingPhraseToAdd.fromConcepts.push(relation.fromConcept.id)
        linkingPhraseToAdd.toConcepts.push(relation.toConcept.id)
        linkingPhraseToAdd.evidenceAnnotations = linkingPhraseToAdd.evidenceAnnotations.concat(relation.evidenceAnnotations)
        linkingPhrases.push(linkingPhraseToAdd)
      }
    }
    const urlFiles = []
    const xmlDoc = document.implementation.createDocument(null, 'cmap', null)
    const cmapElement = xmlDoc.firstChild

    // Create map xmlns:dcterms attribute
    const att = document.createAttribute('xmlns:dcterms')
    att.value = 'http://purl.org/dc/terms/'
    cmapElement.setAttributeNode(att)

    // Create map xmlns attribute
    const att1 = document.createAttribute('xmlns')
    att1.value = 'http://cmap.ihmc.us/xml/cmap/'
    cmapElement.setAttributeNode(att1)

    // Create map xmlns:dc attribute
    const att2 = document.createAttribute('xmlns:dc')
    att2.value = 'http://purl.org/dc/elements/1.1/'
    cmapElement.setAttributeNode(att2)

    // Create map xmlns:vcard attribute
    const att3 = document.createAttribute('xmlns:vcard')
    att3.value = 'http://www.w3.org/2001/vcard-rdf/3.0#'
    cmapElement.setAttributeNode(att3)

    // Create metadata
    const metadata = xmlDoc.createElement('res-meta')
    cmapElement.appendChild(metadata)

    // Set title
    const title = xmlDoc.createElement('dc:title')
    title.textContent = LanguageUtils.camelize(window.abwa.groupSelector.currentGroup.name) + '(' + window.abwa.groupSelector.currentGroup.id + ')'
    metadata.appendChild(title)

    // Set focus question
    const focusQuestion = xmlDoc.createElement('dc:description')
    const topicTheme = window.abwa.codebookManager.codebookReader.getTopicTheme()
    if (topicTheme.topic !== '') {
      focusQuestion.textContent = topicTheme.topic
    } else {
      focusQuestion.textContent = topicTheme.name
    }
    metadata.appendChild(focusQuestion)

    // Set keywords
    const dimensionsTag = xmlDoc.createElement('dc:subject')
    dimensionsTag.textContent = window.abwa.codebookManager.codebookReader.codebook.getDimensionsForCmapCloud()
    metadata.appendChild(dimensionsTag)

    // Set keywords
    const urlsTag = xmlDoc.createElement('dc:language')
    const urlString = window.abwa.codebookManager.codebookReader.codebook.readingMaterials
    urlsTag.textContent = urlString
    metadata.appendChild(urlsTag)

    // Set Hypothes.is group
    const rights = xmlDoc.createElement('dcterms:rightsHolder')
    const creator = xmlDoc.createElement('dc:creator')
    const contributor = xmlDoc.createElement('dc:contributor')
    const groupId = xmlDoc.createElement('vcard:FN')
    groupId.textContent = window.abwa.groupSelector.currentGroup.id
    rights.appendChild(groupId)
    creator.appendChild(groupId)
    contributor.appendChild(groupId)
    metadata.appendChild(rights)
    metadata.appendChild(creator)
    metadata.appendChild(contributor)

    // Create map
    const map = xmlDoc.createElement('map')
    cmapElement.appendChild(map)

    // Concept list
    const conceptList = xmlDoc.createElement('concept-list')
    map.appendChild(conceptList)

    // linking phrase list
    const linkingPhraseList = xmlDoc.createElement('linking-phrase-list')
    map.appendChild(linkingPhraseList)

    // connection list
    const connectionList = xmlDoc.createElement('connection-list')
    map.appendChild(connectionList)
    // resource-group-list
    const resourceGroupList = xmlDoc.createElement('resource-group-list')
    map.appendChild(resourceGroupList)
    // concept appearance list
    const conceptAppearanceList = xmlDoc.createElement('concept-appearance-list')
    map.appendChild(conceptAppearanceList)

    // linking appearance list
    const linkingAppearanceList = xmlDoc.createElement('linking-phrase-appearance-list')
    map.appendChild(linkingAppearanceList)

    // connection appearance list
    const connectionAppearanceList = xmlDoc.createElement('connection-appearance-list')
    map.appendChild(connectionAppearanceList)
    // styleSheetList
    const styleSheetList = xmlDoc.createElement('style-sheet-list')

    const styleSheetDefault = xmlDoc.createElement('style-sheet')
    const styleSheetIdDefault = document.createAttribute('id')
    styleSheetIdDefault.value = '_Default_'
    styleSheetDefault.setAttributeNode(styleSheetIdDefault)

    const mapStyle = xmlDoc.createElement('map-style')
    const mapStyleBackgroundColor = document.createAttribute('background-color')
    mapStyleBackgroundColor.value = '255,255,255,255'
    mapStyle.setAttributeNode(mapStyleBackgroundColor)
    styleSheetDefault.appendChild(mapStyle)

    const styleSheetLatest = xmlDoc.createElement('style-sheet')
    const styleSheetIdLatest = document.createAttribute('id')
    styleSheetIdLatest.value = '_LatestChanges_'
    styleSheetLatest.setAttributeNode(styleSheetIdLatest)

    styleSheetList.appendChild(styleSheetDefault)
    styleSheetList.appendChild(styleSheetLatest)
    map.appendChild(styleSheetList)

    // Add meta-concepts
    const dimensions = window.abwa.codebookManager.codebookReader.codebook.dimensions
    for (let i = 0; i < dimensions.length; i++) {
      const dimension = dimensions[i]
      if (!dimension.isMisc) {
        const dimensionElement = xmlDoc.createElement('concept')
        let id = document.createAttribute('id')
        id.value = dimension.id
        dimensionElement.setAttributeNode(id)
        const label = document.createAttribute('label')
        if (dimension.isMisc) {
          label.value = Config.miscDimensionName
        } else {
          label.value = dimension.name
        }
        dimensionElement.setAttributeNode(label)
        conceptList.appendChild(dimensionElement)
        const dimensionAppearance = xmlDoc.createElement('concept-appearance')
        id = document.createAttribute('id')
        const elementID = dimension.id
        id.value = elementID
        dimensionAppearance.setAttributeNode(id)
        const background = document.createAttribute('background-color')
        background.value = ColorUtils.turnForCmapCloud(dimension.color)
        dimensionAppearance.setAttributeNode(background)
        const font = document.createAttribute('font-style')
        font.value = 'italic|bold'
        dimensionAppearance.setAttributeNode(font)
        const border = document.createAttribute('border-style')
        border.value = 'dashed'
        dimensionAppearance.setAttributeNode(border)
        const fontSize = document.createAttribute('font-size')
        fontSize.value = '18'
        dimensionAppearance.setAttributeNode(fontSize)
        conceptAppearanceList.appendChild(dimensionAppearance)
      }
    }
    // Add concepts
    for (let i = 0; i < concepts.length; i++) {
      const concept = concepts[i]
      const conceptElement = xmlDoc.createElement('concept')
      let id = document.createAttribute('id')
      id.value = concept.theme.id
      conceptElement.setAttributeNode(id)
      const label = document.createAttribute('label')
      if (concept.theme.topic !== '') {
        label.value = concept.theme.topic
      } else {
        label.value = concept.theme.name
      }
      conceptElement.setAttributeNode(label)
      conceptList.appendChild(conceptElement)
      const conceptAppearance = xmlDoc.createElement('concept-appearance')
      id = document.createAttribute('id')
      const elementID = concept.theme.id
      id.value = elementID
      conceptAppearance.setAttributeNode(id)
      const background = document.createAttribute('background-color')
      if (concept.theme.isTopic) {
        // background.value = ColorUtils.turnForCmapCloud(ColorUtils.getTopicColor())
        // conceptAppearance.setAttributeNode(background)
        const font = document.createAttribute('font-style')
        font.value = 'bold'
        conceptAppearance.setAttributeNode(font)
        const fontSize = document.createAttribute('font-size')
        fontSize.value = '16'
        conceptAppearance.setAttributeNode(fontSize)
      } else {
        const dimension = window.abwa.codebookManager.codebookReader.codebook.getDimensionByName(concept.theme.dimension)
        if (dimension) {
          if (!dimension.isMisc) {
            background.value = ColorUtils.turnForCmapCloud(dimension.color)
            conceptAppearance.setAttributeNode(background)
          }
        }
        // font-size="14"
        const fontSize = document.createAttribute('font-size')
        fontSize.value = '14'
        conceptAppearance.setAttributeNode(fontSize)
      }
      conceptAppearanceList.appendChild(conceptAppearance)
      if (concept.evidenceAnnotations.length > 0) {
        for (let i = 0; i < concept.evidenceAnnotations.length; i++) {
          const annotation = concept.evidenceAnnotations[i]
          let name
          if (i === 0) {
            name = LanguageUtils.camelize(concept.theme.name)
          } else {
            name = LanguageUtils.camelize(concept.theme.name)
          }
          name = name.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s/g, '') + '---' + annotation.id
          const url = new ToolURL({ elementID, name, annotation })
          urlFiles.push(url)
        }
      }
    }

    // Add linking phrase
    let connectionID = 1
    for (let i = 0; i < linkingPhrases.length; i++) {
      // Linking phrase
      const linkingPhrase = linkingPhrases[i]
      const linkingElement = xmlDoc.createElement('linking-phrase')
      let id = document.createAttribute('id')
      const elementID = linkingPhrase.id
      id.value = elementID
      linkingElement.setAttributeNode(id)
      const label = document.createAttribute('label')
      label.value = linkingPhrase.linkingWord
      linkingElement.setAttributeNode(label)
      linkingPhraseList.appendChild(linkingElement)
      const linkingAppearance = xmlDoc.createElement('linking-phrase-appearance')
      id = document.createAttribute('id')
      id.value = linkingPhrase.id
      linkingAppearance.setAttributeNode(id)
      linkingAppearanceList.appendChild(linkingAppearance)
      if (linkingPhrase.evidenceAnnotations.length > 0) {
        for (let j = 0; j < linkingPhrase.evidenceAnnotations.length; j++) {
          const annotation = linkingPhrase.evidenceAnnotations[j]
          if (annotation.target) {
            if (annotation.target.length > 0) {
              let name
              const fromName = annotation.tags[0].replace('from:', '')
              const toName = annotation.tags[2].replace('to:', '')
              if (i === 0) {
                name = LanguageUtils.camelize(fromName) + '->' + LanguageUtils.camelize(linkingPhrase.linkingWord) + '->' + LanguageUtils.camelize(toName)
              } else {
                name = LanguageUtils.camelize(fromName) + '->' + LanguageUtils.camelize(linkingPhrase.linkingWord) + '->' + LanguageUtils.camelize(toName)
              }
              name = name.replace(/[^a-zA-Z0-9-> ]/g, '').replace(/\s/g, '') + '---' + annotation.id
              const url = new ToolURL({ elementID, name, annotation })
              urlFiles.push(url)
            }
          }
        }
      }
      // Connection
      // From
      for (let i = 0; i < linkingPhrase.fromConcepts.length; i++) {
        const fromConceptID = linkingPhrase.fromConcepts[i]
        const connectionElement = xmlDoc.createElement('connection')
        id = document.createAttribute('id')
        id.value = connectionID.toString()
        connectionElement.setAttributeNode(id)
        const fromID = document.createAttribute('from-id')
        fromID.value = fromConceptID
        connectionElement.setAttributeNode(fromID)
        const toID = document.createAttribute('to-id')
        toID.value = linkingPhrase.id
        connectionElement.setAttributeNode(toID)
        connectionList.appendChild(connectionElement)
        const connectionAppearanceElement = xmlDoc.createElement('connection-appearance')
        id = document.createAttribute('id')
        id.value = connectionID.toString()
        connectionAppearanceElement.setAttributeNode(id)
        const fromPos = document.createAttribute('from-pos')
        fromPos.value = 'center'
        connectionAppearanceElement.setAttributeNode(fromPos)
        const toPos = document.createAttribute('to-pos')
        toPos.value = 'center'
        connectionAppearanceElement.setAttributeNode(toPos)
        const arrow = document.createAttribute('arrowhead')
        arrow.value = 'yes'
        connectionAppearanceElement.setAttributeNode(arrow)
        connectionAppearanceList.appendChild(connectionAppearanceElement)
        connectionID++
      }

      for (let i = 0; i < linkingPhrase.toConcepts.length; i++) {
        const toConceptID = linkingPhrase.toConcepts[i]
        const connectionElement = xmlDoc.createElement('connection')
        id = document.createAttribute('id')
        id.value = connectionID.toString()
        connectionElement.setAttributeNode(id)
        const fromID = document.createAttribute('from-id')
        fromID.value = linkingPhrase.id
        connectionElement.setAttributeNode(fromID)
        const toID = document.createAttribute('to-id')
        toID.value = toConceptID
        connectionElement.setAttributeNode(toID)
        connectionList.appendChild(connectionElement)
        const connectionAppearanceElement = xmlDoc.createElement('connection-appearance')
        id = document.createAttribute('id')
        id.value = connectionID.toString()
        connectionAppearanceElement.setAttributeNode(id)
        const fromPos = document.createAttribute('from-pos')
        fromPos.value = 'center'
        connectionAppearanceElement.setAttributeNode(fromPos)
        const toPos = document.createAttribute('to-pos')
        toPos.value = 'center'
        connectionAppearanceElement.setAttributeNode(toPos)
        const arrow = document.createAttribute('arrowhead')
        arrow.value = 'yes'
        connectionAppearanceElement.setAttributeNode(arrow)
        connectionAppearanceList.appendChild(connectionAppearanceElement)
        connectionID++
      }
    }

    // Create cmap-parts-list
    const cmapPartsList = xmlDoc.createElement('cmap-parts-list')
    // Annotations
    const annotation = xmlDoc.createElement('annotations')
    const annotationXmlns = document.createAttribute('xmlns')
    annotationXmlns.value = 'http://cmap.ihmc.us/xml/cmap/'
    annotation.setAttributeNode(annotationXmlns)
    const annotationList = xmlDoc.createElement('annotation-list')
    annotation.appendChild(annotationList)
    const annotationAppearanceList = xmlDoc.createElement('annotation-appearance-list')
    annotation.appendChild(annotationAppearanceList)
    cmapPartsList.appendChild(annotation)
    cmapElement.appendChild(cmapPartsList)

    if (exportType === 'archiveFile') {
      ExportCXLArchiveFile.export(xmlDoc, urlFiles)
    } else if (exportType === 'cmapCloud') {
      if (mappingAnnotation) {
        ExportCmapCloud.export(xmlDoc, urlFiles, userData, window.abwa.codebookManager.codebookReader.codebook.getDimensionsForCmapCloud(), urlString, mappingAnnotation)
      }
    }
  }

  static createCmapFromCmapCloud (group, codebook, groupName, userData) {
    const xmlDoc = document.implementation.createDocument(null, 'cmap', null)
    const cmapElement = xmlDoc.firstChild
    // Create processing instruction
    // let pi = xmlDoc.createProcessingInstruction('xml', 'version="1.0" encoding="UTF-8"')
    // xmlDoc.insertBefore(pi, xmlDoc.firstChild)
    // Create map xmlns:dcterms attribute
    const att = document.createAttribute('xmlns:dcterms')
    att.value = 'http://purl.org/dc/terms/'
    cmapElement.setAttributeNode(att)

    // Create map xmlns attribute
    const att1 = document.createAttribute('xmlns')
    att1.value = 'http://cmap.ihmc.us/xml/cmap/'
    cmapElement.setAttributeNode(att1)

    // Create map xmlns:dc attribute
    const att2 = document.createAttribute('xmlns:dc')
    att2.value = 'http://purl.org/dc/elements/1.1/'
    cmapElement.setAttributeNode(att2)

    // Create map xmlns:vcard attribute
    const att3 = document.createAttribute('xmlns:vcard')
    att3.value = 'http://www.w3.org/2001/vcard-rdf/3.0#'
    cmapElement.setAttributeNode(att3)

    // Create metadata
    const metadata = xmlDoc.createElement('res-meta')
    cmapElement.appendChild(metadata)

    // Set title
    const title = xmlDoc.createElement('dc:title')
    title.textContent = LanguageUtils.camelize(group.name) + '(' + group.id + ')'
    metadata.appendChild(title)

    // Set focus question
    const focusQuestion = xmlDoc.createElement('dc:description')
    const themes = codebook.themes
    const topicTheme = _.find(themes, (theme) => { return theme.isTopic === true })
    if (topicTheme.topic !== '') {
      focusQuestion.textContent = topicTheme.topic
    } else {
      focusQuestion.textContent = topicTheme.name
    }
    metadata.appendChild(focusQuestion)

    // Set keywords
    const dimensionsTag = xmlDoc.createElement('dc:subject')
    let dimensionsString = ''
    codebook.dimensions.forEach(dimension => {
      dimensionsString = dimensionsString + dimension.name + ';'
    })
    dimensionsString = dimensionsString.slice(0, -1)
    dimensionsTag.textContent = dimensionsString
    metadata.appendChild(dimensionsTag)

    // Set keywords
    const urlsTag = xmlDoc.createElement('dc:language')
    const urlString = codebook.readingMaterials
    urlsTag.textContent = urlString
    metadata.appendChild(urlsTag)

    // Set Hypothes.is group
    const rights = xmlDoc.createElement('dcterms:rightsHolder')
    const creator = xmlDoc.createElement('dc:creator')
    const contributor = xmlDoc.createElement('dc:contributor')
    const groupId = xmlDoc.createElement('vcard:FN')
    groupId.textContent = group.id
    rights.appendChild(groupId)
    creator.appendChild(groupId)
    contributor.appendChild(groupId)
    metadata.appendChild(rights)
    metadata.appendChild(creator)
    metadata.appendChild(contributor)

    // Create map
    const map = xmlDoc.createElement('map')
    cmapElement.appendChild(map)

    // Concept list
    const conceptList = xmlDoc.createElement('concept-list')
    map.appendChild(conceptList)

    // linking phrase list
    const linkingPhraseList = xmlDoc.createElement('linking-phrase-list')
    map.appendChild(linkingPhraseList)

    // connection list
    const connectionList = xmlDoc.createElement('connection-list')
    map.appendChild(connectionList)
    // resource-group-list
    const resourceGroupList = xmlDoc.createElement('resource-group-list')
    map.appendChild(resourceGroupList)
    // concept appearance list
    const conceptAppearanceList = xmlDoc.createElement('concept-appearance-list')
    map.appendChild(conceptAppearanceList)

    // linking appearance list
    const linkingAppearanceList = xmlDoc.createElement('linking-phrase-appearance-list')
    map.appendChild(linkingAppearanceList)

    // connection appearance list
    const connectionAppearanceList = xmlDoc.createElement('connection-appearance-list')
    map.appendChild(connectionAppearanceList)
    // styleSheetList
    const styleSheetList = xmlDoc.createElement('style-sheet-list')

    const styleSheetDefault = xmlDoc.createElement('style-sheet')
    const styleSheetIdDefault = document.createAttribute('id')
    styleSheetIdDefault.value = '_Default_'
    styleSheetDefault.setAttributeNode(styleSheetIdDefault)

    const mapStyle = xmlDoc.createElement('map-style')
    const mapStyleBackgroundColor = document.createAttribute('background-color')
    mapStyleBackgroundColor.value = '255,255,255,255'
    mapStyle.setAttributeNode(mapStyleBackgroundColor)
    styleSheetDefault.appendChild(mapStyle)

    const styleSheetLatest = xmlDoc.createElement('style-sheet')
    const styleSheetIdLatest = document.createAttribute('id')
    styleSheetIdLatest.value = '_LatestChanges_'
    styleSheetLatest.setAttributeNode(styleSheetIdLatest)

    styleSheetList.appendChild(styleSheetDefault)
    styleSheetList.appendChild(styleSheetLatest)
    map.appendChild(styleSheetList)

    // Add meta-concepts
    const dimensions = codebook.dimensions
    for (let i = 0; i < dimensions.length; i++) {
      const dimension = dimensions[i]
      if (!dimension.isMisc) {
        const dimensionElement = xmlDoc.createElement('concept')
        let id = document.createAttribute('id')
        id.value = dimension.id
        dimensionElement.setAttributeNode(id)
        const label = document.createAttribute('label')
        if (dimension.isMisc) {
          label.value = Config.miscDimensionName
        } else {
          label.value = dimension.name
        }
        dimensionElement.setAttributeNode(label)
        conceptList.appendChild(dimensionElement)
        const dimensionAppearance = xmlDoc.createElement('concept-appearance')
        id = document.createAttribute('id')
        const elementID = dimension.id
        id.value = elementID
        dimensionAppearance.setAttributeNode(id)
        const background = document.createAttribute('background-color')
        background.value = ColorUtils.turnForCmapCloud(dimension.color)
        dimensionAppearance.setAttributeNode(background)
        const font = document.createAttribute('font-style')
        font.value = 'italic|bold'
        dimensionAppearance.setAttributeNode(font)
        const border = document.createAttribute('border-style')
        border.value = 'dashed'
        dimensionAppearance.setAttributeNode(border)
        const fontSize = document.createAttribute('font-size')
        fontSize.value = '18'
        dimensionAppearance.setAttributeNode(fontSize)
        conceptAppearanceList.appendChild(dimensionAppearance)
      }
    }
    // Add concepts
    const concepts = codebook.themes
    for (let i = 0; i < concepts.length; i++) {
      const concept = concepts[i]
      if (concept.name !== 'misc') {
        const conceptElement = xmlDoc.createElement('concept')
        let id = document.createAttribute('id')
        id.value = concept.id
        conceptElement.setAttributeNode(id)
        const label = document.createAttribute('label')
        if (concept.topic !== '') {
          label.value = concept.topic
        } else {
          label.value = concept.name
        }
        conceptElement.setAttributeNode(label)
        conceptList.appendChild(conceptElement)
        const conceptAppearance = xmlDoc.createElement('concept-appearance')
        id = document.createAttribute('id')
        const elementID = concept.id
        id.value = elementID
        conceptAppearance.setAttributeNode(id)
        const background = document.createAttribute('background-color')
        const fontSize = document.createAttribute('font-size')
        if (concept.isTopic) {
          const font = document.createAttribute('font-style')
          // background.value = ColorUtils.turnForCmapCloud(ColorUtils.getTopicColor())
          // conceptAppearance.setAttributeNode(background)
          font.value = 'bold'
          conceptAppearance.setAttributeNode(font)
          fontSize.value = '16'
          conceptAppearance.setAttributeNode(fontSize)
        } else {
          const dimension = codebook.getDimensionByName(concept.dimension)
          if (dimension) {
            background.value = ColorUtils.turnForCmapCloud(dimension.color)
            conceptAppearance.setAttributeNode(background)
          }
          fontSize.value = '14'
          conceptAppearance.setAttributeNode(fontSize)
        }
        conceptAppearanceList.appendChild(conceptAppearance)
      }
    }
    // Create cmap-parts-list
    const cmapPartsList = xmlDoc.createElement('cmap-parts-list')
    // Annotations
    const annotation = xmlDoc.createElement('annotations')
    const annotationXmlns = document.createAttribute('xmlns')
    annotationXmlns.value = 'http://cmap.ihmc.us/xml/cmap/'
    annotation.setAttributeNode(annotationXmlns)
    const annotationList = xmlDoc.createElement('annotation-list')
    annotation.appendChild(annotationList)
    const annotationAppearanceList = xmlDoc.createElement('annotation-appearance-list')
    annotation.appendChild(annotationAppearanceList)
    cmapPartsList.appendChild(annotation)
    cmapElement.appendChild(cmapPartsList)
    // Export Cmap
    ExportCmapCloud.exportFirstMap(groupName, xmlDoc, userData, group, dimensionsString, urlString, codebook)
  }

  static findLinkingPhrase (linkingPhrases, relation) {
    const foundLinkingPhrase = _.find(linkingPhrases, (linkingPhrase) => {
      return (linkingPhrase.linkingWord === relation.linkingWord) && (linkingPhrase.fromConcepts.includes(relation.fromConcept.id) || linkingPhrase.toConcepts.includes(relation.toConcept.id))
    })
    return foundLinkingPhrase
  }

  static mergeLinkingPhrases (linkingPhrases, relationships) {
    for (let i = 0; i < relationships.length; i++) {
      let relation = relationships[i]
      let linkingPhrase = this.findLinkingPhrase(linkingPhrases, relation)
      if (linkingPhrase) {
        if (!linkingPhrase.fromConcepts.includes(relation.fromConcept.id)) {
          linkingPhrase.fromConcepts.push(relation.fromConcept.id)
        }
        if (!linkingPhrase.toConcepts.includes(relation.toConcept.id)) {
          linkingPhrase.toConcepts.push(relation.toConcept.id)
        }
        linkingPhrase.evidenceAnnotations = linkingPhrase.evidenceAnnotations.concat(relation.evidenceAnnotations)
      } else {
        const linkingPhraseToAdd = new LinkingPhrase(relation.linkingWord, relation.id)
        linkingPhraseToAdd.fromConcepts.push(relation.fromConcept.id)
        linkingPhraseToAdd.toConcepts.push(relation.toConcept.id)
        linkingPhraseToAdd.evidenceAnnotations = linkingPhraseToAdd.evidenceAnnotations.concat(relation.evidenceAnnotations)
        linkingPhrases.push(linkingPhraseToAdd)
      }
    }
    return linkingPhrases
  }
}
