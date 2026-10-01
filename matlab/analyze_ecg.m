function result = analyze_ecg(record, seconds, channel)
% Rebuilt offline baseline. Requires Signal Processing Toolbox.
% From repository root: addpath('matlab'); analyze_ecg('data/mitdb/100',60,1)
if nargin < 1, record = fullfile('data','mitdb','100'); end
if nargin < 2, seconds = inf; end
if nargin < 3, channel = 1; end
[signals, fs, names] = read_record212(record);
assert(channel == 1 || channel == 2, 'Channel must be 1 or 2');
assert(seconds > 0 && ~isnan(seconds), 'Duration must be positive');
available = size(signals,1)/fs;
assert(isinf(seconds) || seconds <= available, 'Requested duration exceeds supplied recording');
n = min(size(signals,1), round(seconds*fs));
x = signals(1:n,channel); % Never interleave the two leads.
assert(fs > 80 && n >= 2*fs, 'Need fs > 80 Hz and at least two seconds');
[b,a] = butter(3,[0.5,40]/(fs/2),'bandpass'); filtered = filtfilt(b,a,x);
[b,a] = butter(3,[5,20]/(fs/2),'bandpass'); qrs = filtfilt(b,a,x);
magnitude = abs(qrs); m = median(magnitude);
threshold = max(m+5*median(abs(magnitude-m)), prctile(magnitude,99)*0.25);
[~,candidates] = findpeaks(magnitude,'MinPeakHeight',threshold,...
    'MinPeakProminence',threshold*0.5,'MinPeakDistance',max(1,floor(0.28*fs)));
radius = round(0.06*fs); peaks = zeros(size(candidates));
for k = 1:numel(candidates)
    lo = max(1,candidates(k)-radius); hi = min(n,candidates(k)+radius);
    [~,offset] = max(abs(filtered(lo:hi))); peaks(k) = lo+offset-1;
end
peaks = unique(peaks); rr = diff(peaks)/fs; bpm = NaN;
if ~isempty(rr), bpm = 60/median(rr); end
result = struct('sample_rate_hz',fs,'duration_seconds',n/fs,...
    'detected_beats',numel(peaks),'median_rr_bpm',bpm,...
    'count_based_bpm',numel(peaks)*60*fs/n,'channel',names{channel});
disp(result);
t = (0:n-1)'/fs;
figure; tiledlayout(2,1); nexttile; plot(t,x); ylabel('Raw ECG / mV');
nexttile; plot(t,filtered); hold on; plot(t(peaks),filtered(peaks),'ro');
xlabel('Time / s'); ylabel('Filtered ECG / mV');
if ~exist('outputs','dir'), mkdir('outputs'); end
marker = zeros(n,1); marker(peaks)=1;
writetable(table(t,x,filtered,marker,'VariableNames',{'time_seconds','raw','filtered','r_peak'}),...
    fullfile('outputs','matlab-signal.csv'));
fid = fopen(fullfile('outputs','matlab-summary.json'),'w');
cleanup = onCleanup(@() fclose(fid)); fprintf(fid,'%s\n',jsonencode(result));
end
