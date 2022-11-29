// Configuration for default annotation server
let defaultAnnotationServer
// eslint-disable-next-line quotes
defaultAnnotationServer = "hypothesis"

// Tags configuration
const grouped = {
  group: 'concept'
}
const tags = {
  grouped: grouped,
  motivation: 'motivation'
}
const Config = {
  groupName: 'DefaultReviewModel',
  codebook: 'concept map',
  cmapCloudConfiguration: {
    user: 'highlight01x@gmail.com',
    password: 'producto1',
    uid: '1cf684dc-1764-4e5b-8122-7235ca19c37a'
  },
  defaultAnnotationServer: defaultAnnotationServer,
  namespace: 'oa',
  // eslint-disable-next-line quotes
  urlParamName: "cag", // Name to activate the extension if the url contains this hash param
  tags: tags,
  colors: {
    minAlpha: 0.2,
    maxAlpha: 0.8
  },
  assessmentCategories: [{
    name: 'Minor weakness'
  }, {
    name: 'Major weakness'
  }, {
    name: 'Strength'
  }]
}

export default Config
