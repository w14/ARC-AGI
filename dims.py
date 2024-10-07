
import os
import json
from collections import defaultdict

y = defaultdict(lambda: 0)

data_dir = 'data/training'
for filename in os.listdir(data_dir):
	filename = os.path.join(data_dir, filename)
	trials = json.load(open(filename))
	dims = {}
	bad = False
	for key in [ 'input', 'output' ]:
		dims[key] = set([ (len(trial[key]), len(trial[key][0])) for trial in trials['train'] ] + [ (len(trial[key]), len(trial[key][0])) for trial in trials['test'] ])
		if len(dims[key]) != 1:
			bad = True
	if bad:
		y['diff'] += 1
		continue
	y[(list(dims['input'])[0], list(dims['output'])[0])] += 1

for (key, value) in sorted(y.items(), key = lambda x: - x[1]):
	print(key, value)
