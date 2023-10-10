class URL {
  constructor ({ elementID, name, annotation, direction }) {
    this.id = ''
    this.parentId = elementID
    this.name = name.replace('&', 'And')
    if (direction) {
      this.direction = direction
    } else {
      this.direction = annotation.target[0].source.url
    }
    this.content = '[InternetShortcut]\n' +
      'URL=' + this.direction
  }
}

export default URL
