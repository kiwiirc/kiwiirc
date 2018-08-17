const entry = 'window._kiwi_exports';

function accesorString(value) {
  const childProperties = value.split('.');
  let propertyString = entry;
  let result = '';

  for (let i = 0; i < childProperties.length; i++) {
    if (i > 0) result += `if(!${propertyString}) ${propertyString} = {};\n`;
    propertyString += `[${JSON.stringify(childProperties[i])}]`;
  }

  result += `${propertyString}`;
  return result;
}

module.exports = function(source) {
	if (source.indexOf('\'kiwi public\'') > -1) {
		let resource = this.resourcePath;
		let pos = resource.indexOf('/src/');
		resource = resource.substr(pos + 5);
		resource = resource.replace('/', '.');
		resource = resource.replace(/\.(vue|js)$/, '');

		let a = '\r\n';
		a += `${entry} = ${entry} || {};\r\n`;
		a += accesorString(resource);
		a += `\r\n${entry}.${resource} = exports.default ? exports.default : exports;\r\n`;

		source += a;
	}

	return source;
};