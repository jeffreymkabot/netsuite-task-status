/**
 * @NScriptType ClientScript
 * @NApiVersion 2.x
 * @NAmdConfig /SuiteScripts/amdconfig.json
 */

import { EntryPoints } from 'N/types';
import { initTaskStatus, statusGetter } from './lib/task_status_client';

/**
 * Acquire task id and suitelet url from the page and initialize the task status widget.
 * @param ctx
 */
export function pageInit(ctx: EntryPoints.Client.pageInitContext) {
	const taskId = ctx.currentRecord.getValue({ fieldId: 'custpage_taskid' }) as string;
	const suiteletURL = ctx.currentRecord.getValue({ fieldId: 'custpage_suitelet_url' }) as string;
	const getStatus = statusGetter(suiteletURL);
	initTaskStatus('taskstatus-react-root', {
		taskId,
		getStatus,
		interval: 3000,
		maxConsecutiveErrors: 1,
	}).catch(console.error);
}
