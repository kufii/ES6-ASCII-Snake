(() => {
	'use strict';

	window.Util = {
		q(query, context = document) {
			return context.querySelector(query);
		},
		qq(query, context = document) {
			return Array.from(context.querySelectorAll(query));
		},
		toggleAttribute(node, attr) {
			if (node.hasAttribute(attr)) {
				node.removeAttribute(attr);
			} else {
				node.setAttribute(attr, '');
			}
		}
	};
})();
