import Body from './Body'
import Theme from '../../codebook/model/Theme'
import LanguageUtils from '../../utils/LanguageUtils'
import _ from 'lodash'
import Config from '../../Config'

class Classifying extends Body {
  constructor ({ purpose = Classifying.purpose, code }) {
    super(purpose)
    if (!_.isEmpty(code)) {
      if (/*  */LanguageUtils.isInstanceOf(code, Theme)) {
        this.value = code.toObject()
      } else {
        this.value = code
      }
    } else {
      throw new Error('Body with classifying purpose must contain a code or theme')
    }
  }

  populate (code) {
    super.populate(code)
  }

  serialize () {
    return super.serialize()
  }

  static deserialize (obj) {
    const code = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(obj.id)
    return new Classifying({ code })
  }

  tooltip () {
    let tooltip = ''
    const code = window.abwa.codebookManager.codebookReader.codebook.getCodeOrThemeFromId(this.value.id)
    if (code) {
      tooltip += Config.tags.grouped.group.toString().trim().replace(/^\w/, c => c.toUpperCase()) + ': ' + code.name
    } else {
      tooltip += 'Deleted ' + Config.tags.grouped.group + ': ' + this.value.name
    }
    return tooltip
  }
}

Classifying.purpose = 'classifying'

export default Classifying
