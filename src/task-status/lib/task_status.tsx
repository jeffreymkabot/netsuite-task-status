import { Status, StageStatus } from './task_status_types';
import * as React from 'react';

/**
 * Props used to configure the status widget.
 */
export interface TaskStatusProps {
	taskId: string
	getStatus: (taskId: string) => Promise<Status>
	/** Timeout between calls to getStatus. */
	interval: number
	/** Display error message after too many consecutive errors. */
	maxConsecutiveErrors?: number
	/**
	 * Use this property to rename or hide the progress bar for a stage.
	 * - Set a stage to a string to rename the progress bar for that stage.
	 * - Explicitly set a stage to `null` to hide the bar for that stage.
	 * - Omit a stage to use the default name for that stage.
	 * - Omit this property altogether to show all bars with all default names.
	 *
	 * @example
	 * stages: {
	 *     reduce: 'Create orders',
	 *     summarize: null
	 * }
	 */
	stages?: {
		map?: string | null
		reduce?: string | null
		summarize?: string | null
	}
}

export interface TaskStatusState {
	status: Status | null
	error?: Error
}

/**
 * TaskStatus displays the progress of a Map/Reduce script.
 */
export class TaskStatus extends React.Component<TaskStatusProps, TaskStatusState> {
	timer?: number
	consecutiveErrors: number = 0;

	constructor(props: TaskStatusProps) {
		super(props);
		this.state = { status: null };
	}

	componentDidMount() {
		this.updateStatus();
	}
	componentWillUnmount() {
		if (this.timer) {
			window.clearInterval(this.timer);
		}
	}

	async updateStatus() {
		try {
			const status = await this.props.getStatus(this.props.taskId);
			this.consecutiveErrors = 0;
			this.setState({ status });
			if (status.status === 'COMPLETE' || status.status === 'FAILED') {
				return;
			}
		} catch (exc) {
			this.consecutiveErrors++;
			if (this.props.maxConsecutiveErrors != null &&
				this.consecutiveErrors >= this.props.maxConsecutiveErrors) {
				this.setState({ error: exc });
				return;
			}
		}
		// queue another request
		// use timeout instead of interval to avoid requesting more frequently than response time
		this.timer = window.setTimeout(() => this.updateStatus(), this.props.interval);
	}

	render() {
		const status = this.state.status;
		const error = this.state.error;
		if (error) {
			return this.renderError(error);
		}
		if (!status) {
			return null;
		}

		const hasEllipsis = status.status === 'PENDING' || status.status === 'PROCESSING';
		const title = titleCase(status.status) + (hasEllipsis ? '...' : '');

		const titleDiv = <div className="taskstatus-title">{title}</div>;

		if (status.status === 'COMPLETE' || status.status === 'FAILED') {
			return titleDiv;
		}
		if (status.status === 'PENDING') {
			return this.renderPending(titleDiv);
		}
		return this.renderProcessing(titleDiv, status);
	}

	renderPending(titleDiv: JSX.Element) {
		return (
			<div>
				{titleDiv}
				<IndeterminateProgressBar />
			</div>
		);
	}
	renderProcessing(titleDiv: JSX.Element, status: Status) {
		const stages = this.props.stages;

		// evaluating conditions here to improve readability
		const hideMap = stages && stages.map === null;
		const hideReduce = stages && stages.reduce === null;
		const hideSummarize = stages && stages.summarize === null;

		const bars: JSX.Element[] = [];
		if (!hideMap) {
			bars.push(
				<DeterminateProgressBar
					key="map"
					name={stages && typeof stages.map === 'string' ? stages.map : 'Map'}
					percent={percentComplete(status.map)}
				/>
			);
		}
		if (!hideReduce) {
			bars.push(
				<DeterminateProgressBar
					key="reduce"
					name={stages && typeof stages.reduce === 'string' ? stages.reduce : 'Reduce'}
					percent={percentComplete(status.reduce)}
				/>
			);
		}
		if (!hideSummarize) {
			bars.push(
				<DeterminateProgressBar
					key="summarize"
					name={stages && typeof stages.summarize === 'string' ? stages.summarize : 'Summarize'}
					percent={percentComplete(status.summarize)}
				/>
			);
		}

		return (
			<div>
				{titleDiv}
				{bars}
			</div>
		);
	}
	renderError(error: Error) {
		// prefix error message to clarify that the error is in getting the map/reduce task _status_
		// and not in the map/reduce task itself
		return <div className="taskstatus-error">{`Failed to get status: ${error.message}`}</div>;
	}
}

interface IndeterminateProgressBarProps {
	name?: string
}

function IndeterminateProgressBar(props: IndeterminateProgressBarProps) {
	return (
		<div className="taskstatus-pb">
			<div className="taskstatus-pb-left">{props.name || ''}</div>
			<div className="taskstatus-pb-bar">
				<div className="taskstatus-pb-progress taskstatus-indeterminate" />
			</div>
		</div>
	);
}

interface DeterminateProgressBarProps extends IndeterminateProgressBarProps {
	// should be in range [0, 100]
	percent?: number
}

function DeterminateProgressBar(props: DeterminateProgressBarProps) {
	const style = { width: `${props.percent}%` };
	return (
		<div className="taskstatus-pb">
			<div className="taskstatus-pb-left">{props.name || ''}</div>
			<div className="taskstatus-pb-right">{`${props.percent}%`}</div>
			<div className="taskstatus-pb-bar">
				<div className="taskstatus-pb-progress" style={style} />
			</div>
		</div>
	);
}

function percentComplete(stage: StageStatus) {
	// both total and pending are 0 when stage has not happened
	if (stage.total === 0) {
		return 0;
	}
	if (stage.pending === 0) {
		return 100;
	}
	const pct = 100 * (stage.total - stage.pending) / stage.total;
	// round to two decimal places
	return Math.floor(100 * pct) / 100;
}

function titleCase(word: string) {
	return word.charAt(0).toUpperCase() + word.substring(1).toLowerCase();
}
