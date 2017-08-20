import React from 'react';
import ReactDOM from 'react-dom';

class App extends React.Component {
  render(){
    return (
      <aside>Swiggity swag</aside>
    );
  }
}

console.log('Is this thing actually running?');

ReactDOM.render(
  <App />,
  document.querySelector('menu')
);

/*
Supposedly you can enable hot module reload this way to the modules you
define above. I have not tested it yet though. To use it with react 
this is recommended to be used: https://github.com/gaearon/react-hot-loader 
 if (module.hot) {  
  module.hot.accept('./othermodule.js', function() {
    console.log('Accepting the updated printMe module!');
    printMe();
  })
} */