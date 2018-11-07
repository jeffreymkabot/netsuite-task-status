import { initTaskStatus } from '../src/task-status/lib/task_status_client';
import { Status, TaskStatusString } from '../src/task-status/lib/task_status_types';

initTaskStatus('taskstatus-react-root', {
	taskId: 'demo',
	getStatus: mockStatus,
	interval: 1000,
	map: 'Finding POs and VRAs',
	reduce: 'Creating Bills and Credits',
	summarize: 'none'
});

let i = -3;
function mockStatus(): Promise<Status> {
	const statusString: TaskStatusString = i < 0 ? 'PENDING' : i > 10 ? 'COMPLETE' : 'PROCESSING';
	const status: Status = {
		scriptId: 'demo',
		deploymentId: 'demo',
		status: statusString,
		stage: null,
		stagePercentComplete: 0,
		size: 0,
		map: {
			pending: 5 - bounded(i, 0, 5),
			total: 5,
			pendingBytes: 0
		},
		reduce: {
			pending: 5 - bounded(i - 5, 0, 5),
			total: 5,
			pendingBytes: 0
		},
		summarize: {
			pending: 0,
			total: 0,
			pendingBytes: 0
		}
	};
	if (i <= 10) {
		i++;
	}
	return Promise.resolve(status);
}

function bounded(n: number, min: number, max: number) {
	return Math.max(min, Math.min(max, n));
}
