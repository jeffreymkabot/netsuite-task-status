/**
 * @NAmdConfig /SuiteScripts/amdconfig.json
 */

import { TaskStatusProps } from './task_status';
import { Status, isSuiteletResponse, isSuccessResponse } from './task_status_types';

/**
 * Asynchronously require the task status widget script and initialize the task status widget.
 *
 * @param rootElementId id of the dom element that will contain the task status widget
 * @param props configure the task status widget
 *
 * @returns a promise that is resolved when the task status widget script has executed.
 */
export function initTaskStatus(rootElementId: string, props: TaskStatusProps): Promise<void> {
	// when you set form.clientScriptModulePath the server attempts to evaluate scripts that are
	// statically imported (i.e. in define([...])) by the client script
	// this would throw an error since react and react-dom use APIs like Map() that are not available on the server
	// use a dynamic import (i.e. require([...])) instead
	return Promise.all([
		import('react'),
		import('react-dom'),
		import('./task_status')
	]).then(imports => {
		const [React, ReactDOM, { TaskStatus }] = imports;
		ReactDOM.render(
			React.createElement(TaskStatus, props),
			document.getElementById(rootElementId)
		);
	});
}

/**
 * Produce a function that can be used to poll task status from a suitelet.
 * @param suiteletURL url of the task status suitelet.
 * @returns a function that accepts a taskId and returns a promise that resolves with a Status.
 */
export function statusGetter(suiteletURL: string): (taskId: string) => Promise<Status> {
	const sep = suiteletURL.indexOf('?') >= 0 ? '&' : '?';
	const url = (taskId: string) => suiteletURL + sep + 'taskId=' + taskId;

	return async function(taskId) {
		// use browser API instead of N/https
		// since a client script may run out of governance if it polls the status too many times
		const resp = await window.fetch(url(taskId));

		if (resp.status !== 200) {
			throw new Error(`Unexpected response code: ${resp.status} ${resp.statusText}.`);
		}

		const body = await resp.json();
		if (!isSuiteletResponse(body)) {
			throw new Error('Unexpected response body format.');
		}
		if (!isSuccessResponse(body)) {
			throw new Error(body.message);
		}
		return body.status;
	}
}
