/**
 * Patch the axios instance bundled inside hypothesis-api-client to use the
 * Fetch API instead of XMLHttpRequest.
 *
 * Chrome MV3 service workers have no XMLHttpRequest, so Axios 0.26.x ends up
 * with no adapter and every API call silently fails. fetch() IS available in
 * service workers, so we swap the adapter here before any HypothesisClient is
 * instantiated.
 */
const axios = require('hypothesis-api-client/node_modules/axios')

const META_KEYS = new Set(['common', 'delete', 'get', 'head', 'options', 'post', 'put', 'patch'])

axios.defaults.adapter = (config) => {
  // Merge axios header layers (common + method-specific + explicit) into a flat object
  const methodKey = (config.method || 'get').toLowerCase()
  const headers = Object.assign(
    {},
    config.headers.common || {},
    config.headers[methodKey] || {}
  )
  Object.keys(config.headers).forEach(k => {
    if (!META_KEYS.has(k)) headers[k] = config.headers[k]
  })

  const fetchConfig = {
    method: (config.method || 'GET').toUpperCase(),
    headers
  }
  if (config.data !== undefined && config.data !== null) {
    fetchConfig.body = config.data
  }

  return fetch(config.url, fetchConfig).then(response =>
    response.text().then(text => {
      let data = text
      try { data = JSON.parse(text) } catch (_) {}
      const res = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: {},
        config,
        request: null
      }
      response.headers.forEach((value, key) => { res.headers[key] = value })
      if (response.status >= 200 && response.status < 300) {
        return res
      }
      // Reject with an Axios-compatible error shape
      // eslint-disable-next-line prefer-promise-reject-errors
      return Promise.reject({ response: res })
    })
  )
}
