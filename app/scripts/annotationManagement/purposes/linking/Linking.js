import Body from '../Body'

class Linking extends Body {
  constructor ({ purpose = Linking.purpose, value, cxlID = '' }) {
    super(purpose)
    this.value = value
  }

  populate (value) {
    super.populate(value)
  }

  serialize () {
    return super.serialize()
  }

  static deserialize (obj) {
    const from = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(obj.from)
    const to = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(obj.to)
    const linkingWord = obj.linkingWord
    return new Linking({ from, to, linkingWord })
  }

  tooltip () {
    const from = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(this.value.from)
    const to = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(this.value.to)
    if (from && to) {
      return 'Linking: ' + from.name + ' ' + this.value.linkingWord + ' ' + to.name
    }
  }
}

Linking.purpose = 'linking'

export default Linking
