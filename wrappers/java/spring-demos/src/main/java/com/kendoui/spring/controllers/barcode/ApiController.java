package com.kendoui.spring.controllers.barcode;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;

@Controller("dataviz-barcode-api-controller")
@RequestMapping(value="/dataviz/qrcode/")
public class ApiController {
    @RequestMapping(value = "api", method = RequestMethod.GET)
    public String index() {
        
        return "/dataviz/barcode/api";
    }
}
