function [signal, fs, names] = read_record212(record)
% Read the two-channel format-212 record supplied with this project.
fid = fopen([record '.hea'], 'r');
assert(fid >= 0, 'Cannot open header'); cleanup = onCleanup(@() fclose(fid));
head = strsplit(strtrim(fgetl(fid)));
assert(str2double(head{2}) == 2, 'Expected two channels');
fs = str2double(head{3}); count = str2double(head{4});
gain = zeros(1,2); baseline = gain; first = gain; names = cell(1,2);
for k = 1:2
    fields = strsplit(strtrim(fgetl(fid)));
    assert(strcmp(fields{2}, '212'), 'Expected format 212');
    if k == 1, datafile = fields{1}; else, assert(strcmp(datafile,fields{1}), 'Channels must share a file'); end
    gain(k) = str2double(fields{3}); baseline(k) = str2double(fields{5});
    first(k) = str2double(fields{6}); names{k} = fields{end};
end
clear cleanup;
fid = fopen(fullfile(fileparts(record),datafile), 'rb');
assert(fid >= 0, 'Cannot open data'); cleanup = onCleanup(@() fclose(fid));
b = fread(fid, [3,inf], 'uint8=>double')';
assert(size(b,1) == count, 'Data length does not match header');
digital = [b(:,1)+256*bitand(b(:,2),15), b(:,3)+256*bitshift(b(:,2),-4)];
digital(digital>=2048) = digital(digital>=2048)-4096;
assert(all(digital(1,:) == first), 'First sample does not match header');
signal = (digital-baseline)./gain;
end
