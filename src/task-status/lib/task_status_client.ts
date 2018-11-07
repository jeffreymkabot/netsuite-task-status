import { TaskStatusProps } from './task_status'; // import statements that only import type definitions are elided at runtime
import { Status, isSuiteletResponse, isSuccessResponse } from './task_status_types';

/**
 * Asynchronously require the task status widget script and initialize the task status widget.
 *
 * This function is just a wrapper around the `init` function exported from ./task_status.tsx.
 * NetSuite client scripts need to use this function instead of calling importing and calling `init`
 * directly in order to get around NetSuite's server side static analysis.
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
	return import('./task_status').then(({ init }) => {
		init(rootElementId, props);
	});
}

/**
 * Produce a function that can be used to poll task status from a suitelet.
 * @param suiteletURL url of the task status suitelet.
 * @returns a function that accepts a taskId and returns a promise that resolves with a Status.
 */
export function statusGetter(suiteletURL: string): (taskId: string) => Promise<Status> {
	const sep = suiteletURL.indexOf('?') >= 0 ? '&' : '?';
	const url = (taskId: string) => suiteletURL + sep + 'taskid=' + taskId + '&query=1';

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
