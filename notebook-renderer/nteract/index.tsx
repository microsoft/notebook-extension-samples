import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { transforms, richestMimetype, displayOrder } from './transforms';

class Hello extends React.Component<{ data: any }> {
  render() {
    let data = this.props.data;
    let mimeType = richestMimetype(data, displayOrder, transforms);
    const Transform = transforms[mimeType];
    let rawData = data[mimeType];
    if (Array.isArray(rawData)) {
      rawData = rawData.join('');
    }

    return <Transform data={rawData} />;
  }
}

window['nteract'] = {};

window['nteract'].renderTags = () => {
  let tags = document.body.querySelectorAll('script[type="application/vnd.nteract.view+json"]');
  for (let i = 0; i != tags.length; ++i) {
    let viewtag = tags[i];
    let viewObject = JSON.parse(viewtag.innerHTML);
    let widgetTag = document.createElement('div');
    widgetTag.className = 'widget-subarea';
    viewtag.parentElement.insertBefore(widgetTag, viewtag);
    viewtag.parentElement.removeChild(viewtag);

    ReactDOM.render(
      React.createElement(Hello, {data: viewObject}, null),
      widgetTag
    );
  }
}

window['nteract'].renderTags();

const defaultStyles = document.createElement('style');
defaultStyles.id = '_defaultStyles';
defaultStyles.innerHTML = `
.js-plotly-plot { height: unset !important; }
`;
document.head.prepend(defaultStyles);
