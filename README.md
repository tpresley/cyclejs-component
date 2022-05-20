# cyclejs-component

Simple library for making clean Cycle.js components


## Cycle.js

Cycle.js is a functional reactive coding framework that asks 'what if the user was a function?'

It is worth reading the summary on the [Cycle.js homepage](https://cycle.js.org/ "Cycle.js Homepage"), but essentially Cycle.js allows you to write simple, concise, extensible, and testable code.

## cyclejs-component

The cyclejs-component library makes building Cycle.js apps and components much easier by handling all of the most complex stream plumbing, and provides a minimally opinionated structure to component code while maintaining full forwards and backwards compatibility with all Cycle.js components whether built with or without cyclejs-component.


## Basics

Cyclejs-component provides only 3 functions:
- component() - Builds a Cycle.js component that takes 'sources' and returns 'sinks'
- collection() - Creates an auto-expanding and contracting list of components
- switchable() - Creates a new component that 'swtiches' between a list of provided components

The component() function has several possible parameters, all of which are optional, and the most useful of which are:
- name - A name for the component that is displayed in debug messages
- view - A function that receives the current state and returns virtual dom
- model - An object mapping action names to reducers or commands to be sent to sinks/drivers
- intent - A function that receives Cycle.js souces and returns an object mapping action names to streams/observables that trigger when that action should 'fire'
- initialState - An object representing the initial state for the component


## Prerequisites

The only prerequisite to use cyclejs-component is Cycle.js itself.  See the [Cycle.js documentation](https://cycle.js.org/getting-started.html "Cycle.js Documentation") for a full description, but the easiest way to get started is to install the create-cycle-app npm package:

```bash
npm install --global create-cycle-app
```

Then create a new Cycle.js app with the following command:

```bash
create-cycle-app my-awesome-app
```

Install cyclejs-component, and in almost all cases you will want to use state and interact with the DOM, in which case you need to install the @cycle/state and @cycle/dom packages:

```bash
cd my-awesome-app
npm install cyclejs-component @cycle/state @cycle/dom
```

The create-cycle-app command creates a minimal basic file structure:
- index.js - Initializes the application
- src/app.js(x) - Root component
- public/index.html - HTML page that will host the application

To use the state and DOM drivers, update index.js to the following:

```javascript
import { run } from '@cycle/run'
import { makeDOMDriver } from '@cycle/dom'
import { withState } from '@cycle/state'
import App from './app'

const main = withState(App, "STATE")

const drivers = {
  DOM: makeDOMDriver('#root')
}

run(main, drivers)
```

Now you're all set to create components! If you used create-cycle-app then you can start a WebPack dev server that watches for file changes with:

```bash
npm start
```

## Basic Examples

### Hello World

The most basic (and not very useful) component 

```javascript
import { component } from 'cyclejs-component'

export default component({
  view: () => <h1>Hello World!</h1>
})
```


### Using state (basic)

If the @cycle/state driver is installed and withState() was added to the Cycle.js initialization in index.js then your component will automatically have state.  The most basic way to set component state is with the 'initialState' parameter of component().

```javascript
import { component } from 'cyclejs-component'

export default component({
  initialState: { who: 'World!' },
  view: ({ state }) => <h1>Hello { state.who }</h1>
})
```

### DOM Events

To make components capable of responding to users interacting with the DOM, you will need to add the 'model' and 'intent' parameters.

The 'model' parameter is an object that maps 'action' names to what should be done when that action happens.

The 'intent' parameter is a function that takes Cycle.js 'sources' and returns an object mapping 'action' names to streams/observables which fire/emit when that action should occur.

This sounds more complicated than it is... basically the 'model' answers _what_ can/should happen, and the 'intent' answers _when_ those things will happen.

To illustrate, here's a basic counter that increments when the user clicks anywhere in the page:

```javascript
import { component } from 'cyclejs-component'

export default component({
  // initialize the count to 0
  initialState: { count: 0 },
  model: {
    // when the 'INCREMENT' action happens, run this 'reducer' function
    // which takes the current state and returns the updated state,
    // in this case incrementing the count by 1
    INCREMENT: (state) => {
      return { count: state.count + 1 }
    }
  },
  // the 'sources' passed to intent() is an object containing an entry for each Cycle.js 'driver' passed to run() in index.js
  // the DOM source allows you to select DOM elements by any valid CSS selector, and listen for any DOM events
  // because we map document click events to the 'INCREMENT' action, it will cause the 'INCREMENT' action in 'model' to fire
  // whenever the document is clicked
  intent: (sources) => {
    return {
      INCREMENT: sources.DOM.select('document').events('click')
    }
  },
  // every time the state is changed, the view will automatically be efficiently rerendered (only DOM elements that have changed will be impacted)
  view: ({ state }) => <h1>Current Count: { state.count }</h1>
})
```

### DOM Events (part 2)

Now let's improve our Hello World app with 2-way binding on an input field

```javascript
import { component } from 'cyclejs-component'

export default component({
  // initial name
  initialState: { name: 'World!' },
  model: {
    // update the name in the state whenever the 'CHANGE_NAME' action is triggered
    // this time we use the 2nd parameter of the reducer function which gets the value passed
    // by the stream that triggered the action
    CHANGE_NAME: (state, data) => {
      return { name: data }
    }
  },
  // it's usually more convenient to use destructuring to 'get' the individual sources you need, like DOM in this case
  intent: ({ DOM }) => {
    return {
      // select the input DOM element using it's class name
      // then map changes to the value ('input' event) to extract the value
      // that value will then be passed to the 2nd parameter of reducers in 'model'
      CHANGE_NAME: DOM.select('.name').events('input').map(e => e.target.value)
    }
  },
  view: ({ state }) => {
    return (
      <div>
        <h1>Hello { state.name }</h1>
        {/* set the 'value' of the input to the current state */}
        <input className="name" value={ state.name } />
      </div>
    )
  }
})
```

### Multiple Actions

Now let's improve the counter app with increment and decrement buttons as well as an input field to set the count to any value

```javascript
import { component } from 'cyclejs-component'

// import the xtream observable library so we can do some stream operations
import xs from 'xstream'

export default component({
  initialState: { count: 0 },
  model: {
    // add the value passed from the stream that triggered the action to the current count
    // this will either be 1 or -1, so will increment or decrement the count accordingly
    INCREMENT: (state, data) => ({ count: state.count + data }),
    SET_COUNT: (state, data) => ({ count: parseInt(data || 0) })
  },
  intent: ({ DOM }) => {
    // rather than pass streams directly to the actions, it is sometimes helpful
    // to collect them in variables first
    // it is convention (but not required) to name variables containing streams with a trailing '$'
    // the 'mapTo' function causes the stream to emit the specified value whenever the stream fires
    // so the increment$ stream will emit a '1' and the decrement$ stream a '-1' whenever their
    // respective buttons are pressed, and as usual those values will be passed to the 2nd parameter
    // of the reducer functions in the 'model'
    const increment$ = DOM.select('.increment').events('click').mapTo(1)
    const decrement$ = DOM.select('.decrement').events('click').mapTo(-1)
    const setCount$  = DOM.select('.number').events('input').map(e => e.target.value)

    return {
      // the 'merge' function merges the events from all streams passed to it
      // this causes the 'INCREMENT' action to fire when either the increment$ or decrement$
      // streams fire, and will pass the value that the stream emeits (1 or -1 in this case)
      INCREMENT: xs.merge(increment$, decrement$),
      SET_COUNT: setCount$
    }
  },
  view: ({ state }) => {
    return (
      <div>
        <h1>Current Count: { state.count }</h1>
        <input type="button" className="increment" value="+" />
        <input type="button" className="decrement" value="-" />
        <input className="number" value={ state.count } />
      </div>
    )
  }
})
```
