import { ComponentDescriptor, Component } from "inversify-components";
import { GenericRequestHandler } from "./generic-request-handler";
import { defaultBunyan } from "./default-bunyan";
import { componentInterfaces, Configuration, RequestContext, Logger } from "./interfaces";

import { componentInterfaces as temp } from "../unifier/interfaces";

const defaultConfiguration: Configuration.Defaults = {
  bunyanInstance: defaultBunyan
}

export const descriptor: ComponentDescriptor<Configuration.Defaults> = {
  name: "core:root",
  interfaces: componentInterfaces,
  defaultConfiguration: defaultConfiguration,
  bindings: {
    root: (bindService) => {
      bindService.bindLocalServiceToSelf(GenericRequestHandler);
      bindService.bindGlobalService("logger").toDynamicValue(context => {
        return (context.container.get<Component>("meta:component//core:root").configuration as any).bunyanInstance;
      });
    },
    request: (bindService) => {
      bindService.bindGlobalService("current-logger").toDynamicValue(context => {
        const rootLogger = context.container.get<Logger>("core:root:logger");
        const currentRequest = context.container.get<RequestContext>("core:root:current-request-context");
        return rootLogger.child({ requestId: currentRequest.id });
      }).inSingletonScope();
    }
  }
};