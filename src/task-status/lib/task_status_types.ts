/**
 * Status is a snapshot of all the members of N/task.MapReduceScriptStatus.
 */
export interface Status {
	scriptId: string
	deploymentId: string
	status: TaskStatusString
	stage: MapReduceStageString
	stagePercentComplete: number
	size: number
	map: StageStatus
	reduce: StageStatus
	summarize: StageStatus
}

/**
 * StageStatus groups status values of a particular stage into a single object.
 */
export interface StageStatus {
	pending: number
	pendingBytes: number
	total: number
}

/**
 * Client scripts cannot import N/task to compare against values of the N/task.TaskStatus enum.
 * Suitelet maps values of the N/task.TaskStatus enum to constant strings known at compile time.
 */
export type TaskStatusString = 'PENDING' | 'PROCESSING' | 'FAILED' | 'COMPLETE';

/**
 * Client scripts cannot import N/task to compare against values of the N/task.MapReduceStage enum.
 * Suitelet maps values of the N/task.MapReduceStage enum to constant strings known at compile time.
 * The stage might be `null` if the task status is not `PROCESSING`.
 */
export type MapReduceStageString = 'GET_INPUT' | 'MAP' | 'SHUFFLE' | 'REDUCE' | 'SUMMARIZE' | null;

/**
 * Response shape of the suitelet.
 * We use a boolean success parameter since we cannot control the response code.
 */
export type SuiteletResponse = SuccessResponse | FailureResponse;

export interface SuccessResponse {
	success: true
	status: Status
}

export interface FailureResponse {
	success: false
	message: string
}

export function isSuiteletResponse(arg: any): arg is SuiteletResponse {
	return arg && typeof arg.success === 'boolean' &&
		(!arg.success && typeof arg.message === 'string') || (arg.success && arg.status);
}

export function isSuccessResponse(arg: SuiteletResponse): arg is SuccessResponse {
	return arg.success;
}
