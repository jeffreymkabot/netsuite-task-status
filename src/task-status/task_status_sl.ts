/**
 * Provide a service to poll the status of a Map/Reduce task.
 *
 * @NScriptType Suitelet
 * @NApiVersion 2.x
 * @NAmdConfig /SuiteScripts/amdconfig.json
 */

import { EntryPoints } from 'N/types';
import { ServerResponse } from 'N/https';
import { Status, SuiteletResponse, TaskStatusString, MapReduceStageString } from './lib/task_status_types';

import * as task from 'N/task';
import * as search from 'N/search';
import * as file from 'N/file';
import * as serverWidget from 'N/ui/serverWidget';
import * as runtime from 'N/runtime';
import * as url from 'N/url';

/**
 * Provide a service to poll the status of a Map/Reduce task.
 *
 * @param ctx
 * query parameters
 * - taskid: Which task to check. mandatory
 * - query: Pass any value to get a snapshot of the task status as json.
 *   omit to get a UI that displays the task status.
 * - ifrmcntnr: Pass any value to hide the NetSuite navbar.
 *   NetSuite has some behind the scenes behavior with this parameter
 *   to make the suitelet ui suitable to be embedded in an iframe.
 *
 */
export function onRequest(ctx: EntryPoints.Suitelet.onRequestContext) {
	const taskId = ctx.request.parameters.taskId || ctx.request.parameters.taskid;
	const query = !!ctx.request.parameters.query;
	const isEmbedded = !!ctx.request.parameters.ifrmcntnr;

	try {
		if (typeof taskId !== 'string' || taskId === '') {
			throw new Error(`Invalid task id: ${taskId}`);
		}
		if (!query) {
			const form = createForm(taskId, isEmbedded);
			ctx.response.writePage({ pageObject: form });
			return;
		}

		const status = task.checkStatus({ taskId });
		if (!isMapReduceScriptTaskStatus(status)) {
			throw new Error('Unsupported task type');
		}
		// these are null when the taskId was not a valid taskId
		if (!status.scriptId || !status.deploymentId) {
			throw new Error(`Invalid task id: ${taskId}`);
		}
		respondWith(ctx.response, { success: true, status: snapshot(status) });
	} catch (exc) {
		respondWith(ctx.response, { success: false, message: exc.toString() });
	}
}

function respondWith(resp: ServerResponse, body: SuiteletResponse) {
	resp.setHeader({ name: 'content-type', value: 'application/json' });
	resp.write(JSON.stringify(body));
}

function isMapReduceScriptTaskStatus(
	status: ReturnType<typeof task.checkStatus>
): status is task.MapReduceScriptTaskStatus {
	return status.hasOwnProperty('stage');
}

function snapshot(status: task.MapReduceScriptTaskStatus): Status {
	// status.getPercentageCompleted might throw an exception for completed tasks
	let pct = 0;
	try { pct = status.getPercentageCompleted(); } catch { }

	return {
		// netsuite docs say these "might be" numbers
		scriptId: String(status.scriptId),
		deploymentId: String(status.deploymentId),
		status: N_TaskStatusToString(status.status),
		stage: N_TaskMapReduceStageToString(status.stage),
		stagePercentComplete: pct,
		size: status.getCurrentTotalSize(),
		map: {
			pending: status.getPendingMapCount(),
			pendingBytes: status.getPendingMapSize(),
			total: status.getTotalMapCount()
		},
		reduce: {
			pending: status.getPendingReduceCount(),
			pendingBytes: status.getPendingReduceSize(),
			total: status.getTotalReduceCount()
		},
		summarize: {
			pending: status.getPendingOutputCount(),
			pendingBytes: status.getPendingOutputSize(),
			total: status.getTotalOutputCount()
		}
	};
}

/**
 * Client scripts cannot import N/task.
 * Provide constant strings known at compile time that correspond to the keys of N/task.TaskStatus.
 * @param status
 */
function N_TaskStatusToString(status: task.TaskStatus): TaskStatusString {
	const map: {
		[x: string]: TaskStatusString
		[x: number]: TaskStatusString
	} = {
		[task.TaskStatus.PENDING]: 'PENDING',
		[task.TaskStatus.PROCESSING]: 'PROCESSING',
		[task.TaskStatus.FAILED]: 'FAILED',
		[task.TaskStatus.COMPLETE]: 'COMPLETE',
	};
	return map[status];
}

/**
 * Client scripts cannot import N/task.
 * Provide constant strings known at compile time that correspond to the keys of N/task.MapReduceStage.
 * @param stage
 */
function N_TaskMapReduceStageToString(stage: task.MapReduceStage): MapReduceStageString {
	const map: {
		[x: string]: MapReduceStageString
		[x: number]: MapReduceStageString
	} = {
		[task.MapReduceStage.GET_INPUT]: 'GET_INPUT',
		[task.MapReduceStage.MAP]: 'MAP',
		[task.MapReduceStage.REDUCE]: 'REDUCE',
		[task.MapReduceStage.SHUFFLE]: 'SHUFFLE',
		[task.MapReduceStage.SUMMARIZE]: 'SUMMARIZE'
	};
	return map[stage] || null;
}

/**
 * @param taskId
 * @param isEmbedded
 */
function createForm(taskId: string, isEmbedded: boolean) {
	const form = serverWidget.createForm({
		title: 'Task Status',
		hideNavBar: isEmbedded
	});
	// when you set form.clientScriptModulePath the server attempts to evaluate scripts that are
	// statically imported (i.e. in define([...])) by the client script
	// client script should take care not to statically import scripts that fail to evaluate on the server
	form.clientScriptModulePath = './task_status_sl_cl';

	// put the taskId and the url of this suitelet on the form for use in the attached client script
	const taskField = form.addField({
		id: 'custpage_taskid',
		type: serverWidget.FieldType.TEXT,
		label: 'Task',
	});
	taskField.defaultValue = taskId;
	if (isEmbedded) {
		taskField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });
	} else {
		taskField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.INLINE });
		taskField.updateLayoutType({ layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE });
	}

	const suiteletURLField = form.addField({
		id: 'custpage_suitelet_url',
		type: serverWidget.FieldType.TEXT,
		label: 'Suitelet URL'
	});
	suiteletURLField.defaultValue = suiteletURL();
	suiteletURLField.updateDisplayType({ displayType: serverWidget.FieldDisplayType.HIDDEN });

	const html = file.load({ id: `${suiteletFolderPath()}/lib/task_status.html`}).getContents()
	const taskStatusWidget = form.addField({
		id: 'custpage_react_root',
		type: serverWidget.FieldType.INLINEHTML,
		label: 'react'
	});
	taskStatusWidget.defaultValue = html;

	return form;
}

/**
 * Get the url of the currently executing suitelet.
 */
function suiteletURL() {
	const script = runtime.getCurrentScript();
	return url.resolveScript({
		scriptId: script.id,
		deploymentId: script.deploymentId
	});
}

/**
 * Get the folder path of the currently executing script file.
 */
function suiteletFolderPath() {
	const script = runtime.getCurrentScript();
	const results = search.create({
		type: 'script',
		filters: ['scriptid', 'is', script.id],
		columns: ['scriptfile']
	}).run().getRange({ start: 0, end: 1 });
	if (results.length === 0) {
		throw new Error('Failed to look up script file.');
	}

	const scriptFileId = results[0].getValue('scriptfile') as string;
	const scriptFilePath = file.load({ id: scriptFileId }).path;
	const lastSlash = scriptFilePath.lastIndexOf('/');
	return scriptFilePath.substring(0, lastSlash);
}
