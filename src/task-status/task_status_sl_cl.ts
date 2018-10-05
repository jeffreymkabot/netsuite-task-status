/**
 * @NScriptType ClientScript
 * @NApiVersion 2.x
 * @NAmdConfig /SuiteScripts/amdconfig.json
 */

import { EntryPoints } from 'N/types';
import { TaskStatusProps } from './lib/task_status';
import { initTaskStatus, statusGetter } from './lib/task_status_client';

/**
 * Acquire task id and suitelet url from the page and initialize the task status widget.
 * @param ctx
 */
export function pageInit(ctx: EntryPoints.Client.pageInitContext) {
	const suiteletURL = ctx.currentRecord.getValue({ fieldId: 'custpage_suitelet_url' }) as string;
	const getStatus = statusGetter(suiteletURL);

	const query = window.location.search;
	const params = new URLSearchParams(query);
	const paramMap = params.get('map');
	const paramReduce = params.get('reduce');
	const paramSummarize = params.get('summarize');

	const props: TaskStatusProps = {
		getStatus,
		taskId: params.get('taskid') || params.get('taskId') || '',
		interval: 3000,
		maxConsecutiveErrors: 1,
		map: typeof paramMap === 'string' ? paramMap : 'Map',
		reduce: typeof paramReduce === 'string' ? paramReduce : 'Reduce',
		summarize: typeof paramSummarize === 'string' ? paramSummarize : 'Summarize'
	};

	initTaskStatus('taskstatus-react-root', props).catch(console.error);
}
