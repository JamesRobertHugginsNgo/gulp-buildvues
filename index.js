const nodeSass = require('node-sass');
const through = require('through2');

module.exports = function () {
	return through.obj(function (file, encoding, callback) {
		const paths = file.path.split('/');
		const component = paths[paths.length - 1].replace(/\.vue$/, '');

		let content = file.contents.toString(encoding);

		const styleMatch = content.match(/<style(\s+scoped)?>.*<\/style>/s);
		const scopped = styleMatch[1] && styleMatch[1].trim() === 'scoped';
		let style = styleMatch[0];
		if (style) {
			content = content.replace(style, '');
			style = style.trim().replace(/^<style(\s+scoped)?>/, '').replace(/<\/style>$/, '').trim();
		}
		if (scopped && style) {
			style = nodeSass.renderSync({
				data: `.${component} { ${style} }`
			}).css.toString();
		}

		let template = content.match(/<template>.*<\/template>/s)[0];
		if (template) {
			content = content.replace(template, '');
			template = template.trim().replace(/^<template>/, '').replace(/<\/template>$/, '').trim();
		}
		if (scopped && template) {
			template = `<div class="${component}">${template}</div>`;
		}

		content = content.trim().replace(/^<script>/, '').replace(/<\/script>$/, '').trim();
		content = `
			/* exported ${component} */
			function ${component}() {
				${style ? `
				if (!document.getElementById('${component}')) {
					const style = document.createElement('style');
					style.setAttribute('id', '${component}');
					style.innerHTML='${style.replace(/\s+/g, ' ')}';
					style.appendChild(document.createTextNode('')); // WebKit Hack
					document.head.appendChild(style);
				}
				`: ''}
				const module = {};
				${content.replace(/\s+/g, ' ')}
				${template ? `module.exports.template = '${template.replace(/\s+/g, ' ')}';` : ''}
				return Promise.resolve(module.exports);
			}
		`;

		file.contents = Buffer.from(content, encoding);
		file.path = file.path + '.js';

		callback(null, file);
	});
};
