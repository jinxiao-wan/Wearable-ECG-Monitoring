%% 载入噪声信号数据
YSJ= M;
 %% 数据预处理
[c,l]=size(YSJ);
Y=[];
for i=1:c
    Y=[Y,YSJ(i,:)];
end
[c1,l1]=size(Y);
X=[1:l1];
 %% 绘制噪声信号图像
figure(1);
plot(X,Y);
xlabel('横坐标');
ylabel('纵坐标');
title('原始信号');

 %% 软阈值处理
lev=3;
xs=wden(Y,'heursure','s','one',lev,'db4');%软阈值去噪处理后的信号序列
figure(3)
plot(X,xs)
xlabel('横坐标');
ylabel('纵坐标');
title('软阈值去噪处理')
set(gcf,'Color',[1 1 1])

%% 监测心跳数据

%用户数据输入
sample_freq=360;
data=M;

%R峰识别
cofsq=xs.^2;
Threshold = (max(xs)-min(xs))*0.6+min(xs)*0.83;
[R_pks,R_locs]=findpeaks(xs,500,'MinPeakDistance',0.5,'MinPeakHeight',Threshold);
peak=0;
datapoints=6*sample_freq*10;

for i=1:datapoints
 if cofsq(i) >=Threshold
 peak=peak+1;
 end
end

% 输出
fprintf('Beat interval is %g beats per minute\n',peak);

