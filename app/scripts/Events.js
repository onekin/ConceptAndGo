const Events = {
  // Annotation management events
  annotationCreated: 'annotationCreated',
  annotationUpdated: 'annotationUpdated',
  annotationDeleted: 'annotationDeleted',
  annotationsDeleted: 'annotationsDeleted',
  createAnnotation: 'createAnnotation',
  updateAnnotation: 'updateAnnotation',
  deleteAnnotation: 'deleteAnnotation',
  updatedAllAnnotations: 'updatedAllAnnotations',
  evidenceAnnotationAdded: 'evidenceAnnotationAdded',
  evidenceAnnotationRemoved: 'evidenceAnnotationRemoved',
  updatedDocumentURL: 'updatedDocumentURL',
  relationshipAdded: 'relationshipAdded',
  relationshipsLoaded: 'relationshipsLoaded',
  relationshipUpdated: 'relationshipUpdated',
  relationshipDeleted: 'relationshipDeleted',
  linkAnnotationCreated: 'linkAnnotationCreated',
  linkAnnotationDeleted: 'linkAnnotationDeleted',
  linkAnnotationUpdated: 'linkAnnotationUpdated',
  // Annotation codebook management events
  createCodebook: 'createCodebook',
  codebookCreated: 'codebookCreated',
  createDimension: 'createDimension',
  dimensionCreated: 'dimensionCreated',
  removeDimension: 'removeDimension',
  dimensionRemoved: 'dimensionRemoved',
  updateDimension: 'updateDimension',
  dimensionUpdated: 'dimensionUpdated',
  codebookUpdated: 'codebookUpdated',
  createTheme: 'createTheme',
  themeCreated: 'themeCreated',
  removeTheme: 'removeTheme',
  mergeTheme: 'mergeTheme',
  themeRemoved: 'themeRemoved',
  updateTheme: 'updateTheme',
  themeUpdated: 'themeUpdated',
  renameCodebook: 'renameCodebook',
  codebookRenamed: 'codebookRenamed',
  deleteCodebook: 'deleteCodebook',
  codebookDeleted: 'codebookDeleted',
  targetChanged: 'targetChanged', // TODO Review if it is used somewhere
  codeToAll: 'codeToAll',
  allCoded: 'allCoded',
  groupChanged: 'groupChanged',
  navigateToAnnotationByCode: 'navigateToAnnotationByCode',
  annotatedContentManagerUpdated: 'annotatedContentManagerUpdated',
  navigateToAnnotation: 'navigateToAnnotation',
  codebookRead: 'codebookRead' // Not in codebook variation point because absense of Codebook/Classifying also requires this event currently
}

export default Events
