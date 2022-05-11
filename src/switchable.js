'use strict'

import xs from 'xstream'
import dropRepeats from 'xstream/extra/dropRepeats'



export default function switchable(factories, name$, initial, switched=['DOM']) {
  const withInitial$ = name$
    .compose(dropRepeats())
    .startWith(initial)
    .remember()
  return sources => _switchable(factories, sources, withInitial$, switched)
}



/**
 * create a group of components which can be switched between based on a stream of component names
 *
 * @param {Object} factories maps names to component creation functions
 * @param {Object} sources standard cycle sources object provided to each component
 * @param {Observable} name$ stream of names corresponding to the component names
 * @param {Array} switched which cycle sinks from the components should be `switched` when a new `name$` is emitted
 * @return {Object} cycle sinks object where the selected sinks are switched to the last component name emitted to `name$`
 *
 * any component sinks not dsignated in `switched` will be merged across all components
 */
function _switchable (factories, sources, name$, switched=['DOM'], stateSourceName='STATE') {
  if (typeof switched === 'string') switched = [switched]

  const sinks = Object.entries(factories)
    .map(([name, factory]) => {
      if (sources[stateSourceName]) {
        const state$ = sources[stateSourceName].stream
        const switched = xs.combine(name$, state$)
                           .filter(([newComponentName, _]) => newComponentName == name)
                           .map(([_, state]) => state)
                           .remember()

        const state = new sources[stateSourceName].constructor(switched, sources[stateSourceName]._name)
        return [name, factory({ ...sources, state })]
      }
      return [name, factory(sources)]
    })

  const switchedSinks = Object.keys(sources)
    .reduce((obj, sinkName) => {
      if (switched.includes(sinkName)) {
        obj[sinkName] = name$
          .map( newComponentName => {
            const sink = sinks.find(([componentName, _]) => componentName === newComponentName)
            return (sink && sink[1][sinkName]) || xs.never()
          })
          .flatten()
          .remember()
          .startWith('')
      } else {
        const definedSinks = sinks.filter(([_,sink]) => sink[sinkName] !== undefined)
                                  .map(([_,sink]) => sink[sinkName])
        obj[sinkName] = xs.merge(...definedSinks)
      }
      return obj
    }, {})

  return switchedSinks
}
