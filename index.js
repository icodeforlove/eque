var Promise = require('bluebird'),
	Events = PromiseObject = require('promise-object/mixins/Events'),
	PromiseObject = require('promise-object')(Promise);

var EQue = PromiseObject.create(Events, {
	initialize: function ($config) {
		this._jobs = $config.jobs || [];

		this._totalWorkers = $config.totalWorkers; // required
		this._workersDestroyed = 0;
		this._workersCreated = 0;
		this._createWorkerConcurrency = $config.createWorkerConcurrency || 5;  // required

		this._onDestroyWorker = $config.onDestroyWorker || function () {};
		this._onFinished = $config.onFinished || function () {};
		this._onFinishedCreatingWorker = $config.onFinishedCreatingWorker || function () {};
		this._onFinishedCreatingWorkers = $config.onFinishedCreatingWorkers || function () {};
		this._onEnd = $config.onEnd || function () {};
		this._onCreateWorker = $config.onCreateWorker; // required

		this._workers = [];
		this._workersStatus = [];
		this._hadWorker = false;

		this._timeout = null;
		this._finished = false;
		this._finishedCreatingWorkers = false;
	},

	start: function ($self) {
		var workers = [];
		for (var worker = 0; worker < this._totalWorkers; worker++) {
			workers.push(worker);
		}
		Promise.map(workers, this._addWorker, {concurrency: this._createWorkerConcurrency}).then(function () {
			$self._finishedCreatingWorkers = true;
			
			$self._onFinishedCreatingWorkers();

			if ($self._finished && $self._workersDestroyed === $self._workersCreated) {
				$self._onEnd();
			}
		});
	},

	_addWorker: function ($deferred, $self) {
		$self._onCreateWorker().then(function (worker) {
			if (worker) {
				$self._workersCreated++;
				$self._hadWorker = true;
				
				$self._workers.push(worker);
				
				var key = $self._workers.length - 1;

				$self._workersStatus[key] = false;
				
				$self._onFinishedCreatingWorker(worker);
				$self._next(key);
			}
			
			$deferred.resolve();
		});
	},

	add: function (job) {
		this._jobs.push(job);
		this._next();
	},

	remove: function (job) {
		var jobIndex = this._jobs.indexOf(job),
			workerIndex;

		if (jobIndex !== -1) this._jobs.splice(jobIndex, 1);
		Object.keys(this._workers).some(function (key) {
			if (this._workersStatus[key] === job) {
				this._workersStatus[key] = null
				workerIndex = key;
				return true;
			}
		}, this);

		this._next(workerIndex);
	},

	_getFreeWorkersIndex: function () {
		var index = -1;

		Object.keys(this._workers).some(function (i) {
			if (!this._workersStatus[i]) {
				index = i;
				return true;
			}
		}, this);

		return index;
	},

	_next: function ($self, workerIndex) {
		var freeWorkerIndex = this._getFreeWorkersIndex();

		if (!this._jobs.length || freeWorkerIndex === -1) {
			if (workerIndex !== -1 && workerIndex !== undefined) {
				var worker = $self._workers[freeWorkerIndex];

				delete $self._workers[freeWorkerIndex];
				delete $self._workersStatus[freeWorkerIndex];

				$self._onDestroyWorker(worker).then(function () {
					$self._workersDestroyed++;
					$self._next();
				});

				$self._next();

				return;
			}

			if (!this._timeout && this._jobs.length) {
				this._timeout = setTimeout(function () {
					$self._timeout = null;
					$self._next(workerIndex);
				}, 200);
				return;
			}

			if (this._hadWorker && Object.keys($self._workersStatus).length === 0 && !this._finished) {
				this._finished = true;
				this._onFinished();
	 		}

			if (this._finishedCreatingWorkers && $self._workersDestroyed === $self._workersCreated) {
				this._onEnd();
			}

			return;
		}

		var job = this._jobs.shift();

		this._workersStatus[freeWorkerIndex] = job;

		setTimeout(function () {
			job($self._workers[freeWorkerIndex], function () {
				$self.remove(job);
			});
		}, 0);
	}
});

module.exports.start = function ($config) {
	return new Promise(function (resolve, reject) {
		$config.onEnd = function (response) {
			resolve(response);
		};

		var queue = new EQue($config);
		queue.start();
	});
};