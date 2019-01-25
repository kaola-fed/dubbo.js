<a name="0.3.2"></a>
## [0.3.2](https://github.com/kaola-fed/dubbo.js/compare/v0.2.18...v0.3.2) (2019-01-23)


### Bug Fixes

* add disconnect event listener ([a707669](https://github.com/kaola-fed/dubbo.js/commit/a707669))
* env logic modify ([ec5fc55](https://github.com/kaola-fed/dubbo.js/commit/ec5fc55))
* error ([75a54fb](https://github.com/kaola-fed/dubbo.js/commit/75a54fb))
* fix bugs ([0d2b793](https://github.com/kaola-fed/dubbo.js/commit/0d2b793))
* fix lose this.logger && update version 0.3.0 ([90ac35d](https://github.com/kaola-fed/dubbo.js/commit/90ac35d))
* header repeat ([bb5f9e1](https://github.com/kaola-fed/dubbo.js/commit/bb5f9e1))
* 修复zk默认重试传参问题 ([6cf6914](https://github.com/kaola-fed/dubbo.js/commit/6cf6914))


### Features

* add rpc head support ([77fa5b1](https://github.com/kaola-fed/dubbo.js/commit/77fa5b1))
* support contextPath ([e62115a](https://github.com/kaola-fed/dubbo.js/commit/e62115a))
* update version 0.3.1 ([49a3574](https://github.com/kaola-fed/dubbo.js/commit/49a3574))
* 支持entrenceEnv透传 ([fca492b](https://github.com/kaola-fed/dubbo.js/commit/fca492b))



<a name="0.2.18"></a>
## [0.2.18](https://github.com/kaola-fed/dubbo.js/compare/v0.2.16...v0.2.18) (2018-10-10)


### Bug Fixes

* modify err back ([b947ce2](https://github.com/kaola-fed/dubbo.js/commit/b947ce2))
* modify err back ([0bd4bd9](https://github.com/kaola-fed/dubbo.js/commit/0bd4bd9))



<a name="0.2.16"></a>
## [0.2.16](https://github.com/kaola-fed/dubbo.js/compare/v0.2.15...v0.2.16) (2018-09-28)


### Bug Fixes

* fix resp code ([3595dd9](https://github.com/kaola-fed/dubbo.js/commit/3595dd9))


### Features

* use httpclient to resolve jsonrpc protocol ([d3ebbe7](https://github.com/kaola-fed/dubbo.js/commit/d3ebbe7))



<a name="0.2.15"></a>
## [0.2.15](https://github.com/kaola-fed/dubbo.js/compare/v0.2.14...v0.2.15) (2018-09-25)



<a name="0.2.14"></a>
## [0.2.14](https://github.com/kaola-fed/dubbo.js/compare/v0.2.13...v0.2.14) (2018-09-07)


### Features

* 增加可选loadBalancer方法 & 熔断器可配 ([210e3ee](https://github.com/kaola-fed/dubbo.js/commit/210e3ee))



<a name="0.2.13"></a>
## [0.2.13](https://github.com/kaola-fed/dubbo.js/compare/v0.2.12...v0.2.13) (2018-09-05)


### Bug Fixes

* resolve socket reconnect error ([2316be8](https://github.com/kaola-fed/dubbo.js/commit/2316be8))



<a name="0.2.12"></a>
## [0.2.12](https://github.com/kaola-fed/dubbo.js/compare/v0.2.11...v0.2.12) (2018-08-30)


### Bug Fixes

* 修复jsonRpc传参数带中文的问题，主要是请求体长度判断修正 ([f887d77](https://github.com/kaola-fed/dubbo.js/commit/f887d77))



<a name="0.2.11"></a>
## [0.2.11](https://github.com/kaola-fed/dubbo.js/compare/v0.2.10...v0.2.11) (2018-08-22)


### Bug Fixes

* jsonrpc 返回消息体buffer拼接中文乱码问题处理 ([2320fd7](https://github.com/kaola-fed/dubbo.js/commit/2320fd7))



<a name="0.2.10"></a>
## [0.2.10](https://github.com/kaola-fed/dubbo.js/compare/v0.2.9...v0.2.10) (2018-08-22)



<a name="0.2.9"></a>
## [0.2.9](https://github.com/kaola-fed/dubbo.js/compare/v0.2.8...v0.2.9) (2018-08-22)


### Bug Fixes

* **修复BUG:** 修复了jsonRpc协议下消息体长度判断的逻辑，同时修复了重试逻辑中header的赋值问题 ([6e22ae5](https://github.com/kaola-fed/dubbo.js/commit/6e22ae5))



<a name="0.2.8"></a>
## [0.2.8](https://github.com/kaola-fed/dubbo.js/compare/v0.2.7...v0.2.8) (2018-08-21)


### Features

* 微调jsonrpc协议下 msgId的传参方式 ([816df4c](https://github.com/kaola-fed/dubbo.js/commit/816df4c))



<a name="0.2.7"></a>
## [0.2.7](https://github.com/kaola-fed/dubbo.js/compare/v0.2.6...v0.2.7) (2018-08-21)


### Bug Fixes

* fix lint problem ([6a1e0b2](https://github.com/kaola-fed/dubbo.js/commit/6a1e0b2))


### Features

* 改变jsonRpc协议下的调用方式 ([b18618b](https://github.com/kaola-fed/dubbo.js/commit/b18618b))



<a name="0.2.6"></a>
## [0.2.6](https://github.com/kaola-fed/dubbo.js/compare/4035b6f...v0.2.6) (2018-08-17)


### Bug Fixes

* test error ([cadc074](https://github.com/kaola-fed/dubbo.js/commit/cadc074))
* 确实函数执行 ([401c62d](https://github.com/kaola-fed/dubbo.js/commit/401c62d))
* **encoder:** fix encoder interfaceName ([a3cc14b](https://github.com/kaola-fed/dubbo.js/commit/a3cc14b))
* **npmignore .ts:** npmignore .ts files ([b01e8d7](https://github.com/kaola-fed/dubbo.js/commit/b01e8d7))


### Features

* add create regsitry client ([58a13b1](https://github.com/kaola-fed/dubbo.js/commit/58a13b1))
* add create-registry-client ([7fc89e2](https://github.com/kaola-fed/dubbo.js/commit/7fc89e2))
* export createRegistry ([8bc857b](https://github.com/kaola-fed/dubbo.js/commit/8bc857b))
* initial files ([4035b6f](https://github.com/kaola-fed/dubbo.js/commit/4035b6f))
* load balancer ([46e9154](https://github.com/kaola-fed/dubbo.js/commit/46e9154))
* RpcClient, Consumer, Registry 架子撑起来 ([e55c652](https://github.com/kaola-fed/dubbo.js/commit/e55c652))
* service discovery ([9abf937](https://github.com/kaola-fed/dubbo.js/commit/9abf937))
* 增加一些注释 ([cad19f2](https://github.com/kaola-fed/dubbo.js/commit/cad19f2))
* **first commit:** 修改发布包的基本文件 ([0fca7e0](https://github.com/kaola-fed/dubbo.js/commit/0fca7e0))



