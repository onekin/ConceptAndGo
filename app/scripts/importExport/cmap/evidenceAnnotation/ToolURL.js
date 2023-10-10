import URL from './URL'
import Config from '../../../Config'

class ToolURL extends URL {
  constructor ({ elementID, name, annotation, direction }) {
    super({ elementID, name, annotation, direction })
    if (direction) {
      this.direction = direction
    } else {
      this.direction = annotation.target[0].source.url + '#' + Config.urlParamName + ':' + annotation.id
    }
    this.content = '[InternetShortcut]\n' +
      'URL=' + this.direction
  }
}

export default ToolURL
