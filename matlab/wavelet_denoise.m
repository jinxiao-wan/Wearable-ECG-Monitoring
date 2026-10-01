function clean = wavelet_denoise(signal)
% Optional reconstruction of original db3 / four-level soft-threshold denoising.
% Requires Wavelet Toolbox. Do not rename this function wavedec.m.
x = double(signal(:));
assert(numel(x) >= 64 && all(isfinite(x)), 'Provide at least 64 finite samples');
[c,l] = wavedec(x,4,'db3');
thresholds = zeros(1,4);
for level = 1:4
    detail = detcoef(c,l,level);
    thresholds(level) = thselect(detail,'rigrsure');
end
clean = wdencmp('lvd',x,'db3',4,thresholds,'s');
clean = clean(:);
end
