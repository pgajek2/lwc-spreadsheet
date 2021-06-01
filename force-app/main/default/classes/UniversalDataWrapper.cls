public class UniversalDataWrapper {
    
    public UniversalDataWrapper() {
        this.columns = new List<Column>();
        this.data = new List<Data>();
        this.keyField = 'Id';
    }

    @AuraEnabled
    public List<Column> columns {get; set;}
    @AuraEnabled
    public List<Data> data {get; set;}
    @AuraEnabled
    public String keyField {get; set;}

    public class Column {
        @AuraEnabled
        public String label {get; set;}
        @AuraEnabled
        public String fieldName {get; set;}
        @AuraEnabled
        public String type {get; set;}

        public Column(String label, 
                      String fieldName, 
                      String type) {
            this.label = label;
            this.fieldName = fieldName;
            this.type = type;
        }
    }

    public class Data {
        @AuraEnabled
        public String value {get; set;}
        @AuraEnabled
        public String fieldName {get; set;}
        @AuraEnabled
        public String type {get; set;}

        public Data(String value,
                    String fieldName,
                    String type) {
            this.value = value;
            this.fieldName = fieldName;
            this.type = type;
        }
    }
}
