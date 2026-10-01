E=M;%导入我的信号，是一个包含300个点的正常心电信号片段
fs=360*60;
 
 
%小波分解
[c,l]=wavedec(E,4,'db3');%选择db3小波基函数，分解为4层
%利用小波'db5'从分解系数[C,L]中提取第N层近似系数(approximation coefficient,cA)和细节系数（detail coefficient,cD)
ca4=appcoef(c,l,'db3',4);
cd1=detcoef(c,l,1);
cd2=detcoef(c,l,2);
cd3=detcoef(c,l,3);
cd4=detcoef(c,l,4);
 
%使用stein的无偏似然估计原理进行选择各层的阈值 
%'rigrsure’为无偏似然估计阈值类型
thr1=thselect(cd1,'rigrsure');
thr2=thselect(cd2,'rigrsure');
thr3=thselect(cd3,'rigrsure');
thr4=thselect(cd4,'rigrsure');
%各层的阈值
TR=[thr1,thr2,thr3,thr4];
%'s'为软阈值;'h'硬阈值。
SORH='s';
%---------去噪----------------
%XC为去噪后信号
%[CXC,LXC]为 小波分解结构
%PERF0和PERF2是恢复和压缩的范数百分比。
%'lvd'为允许设置各层的阈值,
%'gbl'为固定阈值。
%3为阈值的长度
 [XC,CXC,LXC,PERF0,PERF2]=wdencmp('lvd',E,'db3',4,TR,SORH);
%对比原始信号和除噪后的信号
plot(E,'b');  hold on;%蓝色为原始信号
plot(XC,'r');%红色为滤波后信号
xlabel('采样点');
ylabel('幅值/mV');
    