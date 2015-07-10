# Eque

Eque is a async queuing mechanism for fixed job sets. It shines with its ability to spawn/destroy workers in an async manner at the same time as queuing jobs.


# Usage

```js
EQue.start({
	createWorkerConcurrency: 2,
 
	totalWorkers: queueNames.length,
 
	jobs: [
		function (worker, callback) {
			setTimeout(function () {
				console.log(worker);
				callback();
			}, 1000);
		},
		function (worker, callback) {
			setTimeout(function () {
				console.log(worker);
				callback();
			}, 1000);
		}
	],

	onCreateWorker: function () {
		// async code for creating the worker expects a resolve(worker), or resolve(null) if you want to skip the creation of the worker
		return new Promise(function (resolve, reject) {
			setTimeout(function () {
				var worker = queueNames.shift();
				
				if (typeof worker !== 'undefined') {
					resolve(worker);
				} else {
					reject();
				}
			}, 1000);
		});
	},
 
	onDestroyWorker: function (worker) {
		// async code for destroying the worker expects a promise()
		console.log('[event] emptyworker', worker);
		return new Promise(function (resolve, reject) {
			setTimeout(function () {
				resolve();
			}, 9000);
		});
	},
 
	onFinishedCreatingWorker: function (worker) {
		// called when a worker has been created
	},

	onFinishedCreatingWorkers: function () {
		// called when all workers have been created
	},

	onFinished: function () {
		// called when all jobs are finished
	}
}).then(function () {
	console.log('DONEE');
});
```
