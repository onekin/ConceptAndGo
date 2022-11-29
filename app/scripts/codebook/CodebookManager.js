import _ from 'lodash'
import CreateCodebook from './operations/create/CreateCodebook'
import ReadCodebook from './operations/read/ReadCodebook'
import UpdateCodebook from './operations/update/UpdateCodebook'
import DeleteCodebook from './operations/delete/DeleteCodebook'
import RenameCodebook from './operations/update/RenameCodebook'

class CodebookManager {
  constructor () {
    this.codebookCreator = new CreateCodebook()
    this.codebookReader = new ReadCodebook()
    this.codebookUpdater = new UpdateCodebook()
    this.codebookDeleter = new DeleteCodebook()
    this.codebookRenamer = new RenameCodebook()
  }

  init (callback) {
    this.codebookCreator.init()
    this.codebookReader.init(() => {
      if (_.isFunction(callback)) {
        callback()
      }
    })
    this.codebookUpdater.init()
    this.codebookDeleter.init()
    this.codebookRenamer.init()
  }

  destroy () {
    // Destroy components of codebook
    this.codebookCreator.destroy()
    this.codebookReader.destroy()
    this.codebookUpdater.destroy()
    this.codebookDeleter.destroy()
    this.codebookRenamer.destroy()
  }
}

export default CodebookManager
